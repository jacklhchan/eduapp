from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from google.cloud import firestore, storage


DEMO_PARENT_ID = "parent-demo"
DEMO_CHILD_ID = "child-matthew"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def use_memory_backend() -> bool:
    return os.getenv("EDUPASS_STORAGE_BACKEND") == "memory"


class Persistence:
    def __init__(self) -> None:
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT")
        self.bucket_name = os.getenv("EDUPASS_STORAGE_BUCKET", "")
        self._memory: dict[str, dict[str, Any]] = {
            "parents": {},
            "children": {},
            "documents": {},
            "portfolio_exports": {},
        }
        self._firestore = None
        self._storage = None

    @property
    def firestore(self):
        if use_memory_backend() or not self.project_id:
            return None
        if self._firestore is None:
            self._firestore = firestore.Client(project=self.project_id)
        return self._firestore

    @property
    def storage(self):
        if use_memory_backend() or not self.bucket_name:
            return None
        if self._storage is None:
            self._storage = storage.Client(project=self.project_id)
        return self._storage

    def ensure_demo_data(self, email: str) -> dict[str, Any]:
        parent = {
            "id": DEMO_PARENT_ID,
            "email": email,
            "display_name": "Matthew's Parent",
            "avatar_url": None,
            "onboarding_complete": True,
        }
        children = [
            {
                "id": DEMO_CHILD_ID,
                "parent_id": DEMO_PARENT_ID,
                "name": "Matthew",
                "grade": "P3",
                "passport": "Learning Passport",
                "focus": "小學數學 + 升小 Portfolio",
                "language": "繁中 / English",
                "school_type": "香港主流小學",
                "avatar_url": None,
                "sort_order": 10,
            },
            {
                "id": "child-chloe",
                "parent_id": DEMO_PARENT_ID,
                "name": "Chloe",
                "grade": "K2",
                "passport": "Learning Passport",
                "focus": "幼稚園 Portfolio",
                "language": "繁中 / English",
                "school_type": "香港幼稚園",
                "avatar_url": None,
                "sort_order": 20,
            },
        ]

        db = self.firestore
        if db is None:
            self._memory["parents"][DEMO_PARENT_ID] = parent
            for child in children:
                self._memory["children"][child["id"]] = child
            return self.get_parent_with_children(DEMO_PARENT_ID)

        db.collection("parents").document(DEMO_PARENT_ID).set(parent, merge=True)
        for child in children:
            db.collection("children").document(child["id"]).set(child, merge=True)
        return self.get_parent_with_children(DEMO_PARENT_ID)

    def get_parent_by_email(self, email: str) -> dict[str, Any] | None:
        normalized = email.strip().lower()
        db = self.firestore
        if db is None:
            for parent in self._memory["parents"].values():
                if str(parent.get("email", "")).lower() == normalized:
                    return self.get_parent_with_children(str(parent.get("id", "")))
            return None

        snapshots = db.collection("parents").where("email", "==", normalized).limit(1).stream()
        for snapshot in snapshots:
            parent = snapshot.to_dict() or {}
            return self.get_parent_with_children(str(parent.get("id", snapshot.id)))
        return None

    def create_parent(self, email: str, display_name: str, pin_hash: str) -> dict[str, Any]:
        parent = {
            "id": f"parent-{uuid.uuid4().hex[:10]}",
            "email": email.strip().lower(),
            "display_name": display_name.strip() or "EduPass Parent",
            "avatar_url": None,
            "onboarding_complete": False,
            "pin_hash": pin_hash,
            "created_at": now_iso(),
        }
        db = self.firestore
        if db is None:
            self._memory["parents"][parent["id"]] = parent
        else:
            db.collection("parents").document(parent["id"]).set(parent)
        return self.get_parent_with_children(parent["id"])

    def patch_parent(self, parent_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        allowed = {"display_name", "avatar_url", "onboarding_complete"}
        clean = {key: value for key, value in updates.items() if key in allowed and value is not None}
        db = self.firestore
        if db is None:
            parent = self._memory["parents"].get(parent_id)
            if not parent:
                return {}
            parent.update(clean)
            return self.get_parent_with_children(parent_id)

        ref = db.collection("parents").document(parent_id)
        snapshot = ref.get()
        if not snapshot.exists:
            return {}
        ref.set(clean, merge=True)
        return self.get_parent_with_children(parent_id)

    def get_parent_with_children(self, parent_id: str) -> dict[str, Any]:
        db = self.firestore
        if db is None:
            parent = dict(self._memory["parents"].get(parent_id, {}))
            children = [
                dict(child)
                for child in self._memory["children"].values()
                if child.get("parent_id") == parent_id
            ]
        else:
            parent_snapshot = db.collection("parents").document(parent_id).get()
            if not parent_snapshot.exists:
                return {}
            parent = parent_snapshot.to_dict() or {}
            children = [
                snapshot.to_dict() or {}
                for snapshot in db.collection("children").where("parent_id", "==", parent_id).stream()
            ]
        children.sort(key=lambda child: (int(child.get("sort_order", 999)), str(child.get("name", ""))))
        parent["children"] = children
        return parent

    def patch_child(self, parent_id: str, child_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        allowed = {"name", "grade", "passport", "focus", "language", "school_type", "avatar_url"}
        clean = {key: value for key, value in updates.items() if key in allowed}
        db = self.firestore
        if db is None:
            child = self._memory["children"].get(child_id)
            if not child or child.get("parent_id") != parent_id:
                return {}
            child.update(clean)
            return dict(child)

        ref = db.collection("children").document(child_id)
        snapshot = ref.get()
        child = snapshot.to_dict() if snapshot.exists else None
        if not child or child.get("parent_id") != parent_id:
            return {}
        ref.set(clean, merge=True)
        child.update(clean)
        return child

    def create_child(self, parent_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        clean = {
            "id": f"child-{uuid.uuid4().hex[:8]}",
            "parent_id": parent_id,
            "name": str(payload.get("name") or "New Child").strip() or "New Child",
            "grade": str(payload.get("grade") or "P1").strip() or "P1",
            "passport": str(payload.get("passport") or "Learning Passport").strip() or "Learning Passport",
            "focus": str(payload.get("focus") or "小學數學 + Portfolio").strip() or "小學數學 + Portfolio",
            "language": str(payload.get("language") or "繁中 / English").strip() or "繁中 / English",
            "school_type": str(payload.get("school_type") or "香港主流小學").strip() or "香港主流小學",
            "avatar_url": payload.get("avatar_url"),
            "sort_order": int(payload.get("sort_order") or 100),
        }
        db = self.firestore
        if db is None:
            self._memory["children"][clean["id"]] = clean
            parent = self._memory["parents"].get(parent_id)
            if parent:
                parent["onboarding_complete"] = True
        else:
            db.collection("children").document(clean["id"]).set(clean)
            db.collection("parents").document(parent_id).set({"onboarding_complete": True}, merge=True)
        return clean

    def upload_bytes(self, path: str, content: bytes, content_type: str) -> str | None:
        client = self.storage
        if client is None:
            local_path = Path("/tmp/edupass-storage") / path
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(content)
            return f"file://{local_path}"
        bucket = client.bucket(self.bucket_name)
        blob = bucket.blob(path)
        blob.upload_from_string(content, content_type=content_type)
        return f"gs://{self.bucket_name}/{path}"

    def read_bytes(self, storage_uri: str) -> bytes:
        if storage_uri.startswith("file://"):
            return Path(storage_uri.removeprefix("file://")).read_bytes()
        if not storage_uri.startswith("gs://"):
            raise ValueError("Unsupported storage URI")
        if self.storage is None:
            raise ValueError("Cloud storage is not configured")
        bucket_name, blob_path = storage_uri.removeprefix("gs://").split("/", 1)
        return self.storage.bucket(bucket_name).blob(blob_path).download_as_bytes()

    def save_document(self, record: dict[str, Any]) -> dict[str, Any]:
        db = self.firestore
        if db is None:
            self._memory["documents"][record["id"]] = record
        else:
            db.collection("documents").document(record["id"]).set(record)
        return record

    def save_portfolio_export(self, record: dict[str, Any]) -> dict[str, Any]:
        db = self.firestore
        if db is None:
            self._memory["portfolio_exports"][record["id"]] = record
        else:
            db.collection("portfolio_exports").document(record["id"]).set(record)
        return record

    def get_portfolio_export(self, parent_id: str, export_id: str) -> dict[str, Any] | None:
        db = self.firestore
        if db is None:
            record = self._memory["portfolio_exports"].get(export_id)
        else:
            snapshot = db.collection("portfolio_exports").document(export_id).get()
            record = snapshot.to_dict() if snapshot.exists else None
        if not record or record.get("parent_id") != parent_id:
            return None
        return record


persistence = Persistence()
