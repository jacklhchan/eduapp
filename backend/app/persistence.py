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
            "audit_events": {},
            "parents": {},
            "children": {},
            "documents": {},
            "practice_attempts": {},
            "portfolio_exports": {},
            "shared_reports": {},
        }
        self._firestore = None
        self._storage = None

    def default_privacy_settings(self, consented: bool = False) -> dict[str, Any]:
        return {
            "ai_processing_consent": consented,
            "upload_storage_consent": consented,
            "portfolio_export_consent": consented,
            "product_updates_consent": False,
            "retention_days": 365,
            "consent_version": "prototype-2026-06-01",
            "consent_updated_at": now_iso() if consented else None,
        }

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
            "privacy_settings": self.default_privacy_settings(consented=True),
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
                "portfolio_sections": [],
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
                "portfolio_sections": [],
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
            "privacy_settings": self.default_privacy_settings(consented=False),
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
            if parent_id not in self._memory["parents"]:
                return {}
            parent = dict(self._memory["parents"][parent_id])
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
        parent.setdefault("privacy_settings", self.default_privacy_settings(consented=False))
        children.sort(key=lambda child: (int(child.get("sort_order", 999)), str(child.get("name", ""))))
        parent["children"] = children
        return parent

    def patch_child(self, parent_id: str, child_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        allowed = {"name", "grade", "passport", "focus", "language", "school_type", "avatar_url", "portfolio_sections"}
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
            "passport": str(payload.get("passport") or "").strip(),
            "focus": str(payload.get("focus") or "").strip(),
            "language": str(payload.get("language") or "").strip(),
            "school_type": str(payload.get("school_type") or "").strip(),
            "avatar_url": payload.get("avatar_url"),
            "portfolio_sections": payload.get("portfolio_sections") or [],
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

    def update_privacy_settings(self, parent_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        allowed = {
            "ai_processing_consent",
            "upload_storage_consent",
            "portfolio_export_consent",
            "product_updates_consent",
            "retention_days",
        }
        parent = self.get_parent_with_children(parent_id)
        if not parent:
            return {}
        privacy = {
            **self.default_privacy_settings(consented=False),
            **dict(parent.get("privacy_settings") or {}),
        }
        for key, value in updates.items():
            if key in allowed and value is not None:
                privacy[key] = value
        privacy["consent_version"] = "prototype-2026-06-01"
        privacy["consent_updated_at"] = now_iso()

        db = self.firestore
        if db is None:
            memory_parent = self._memory["parents"].get(parent_id)
            if not memory_parent:
                return {}
            memory_parent["privacy_settings"] = privacy
        else:
            db.collection("parents").document(parent_id).set({"privacy_settings": privacy}, merge=True)
        self.record_audit_event(parent_id, "privacy_settings_updated", details={"privacy_settings": privacy})
        return self.get_parent_with_children(parent_id)

    def list_child_data_summaries(self, parent_id: str) -> list[dict[str, Any]]:
        parent = self.get_parent_with_children(parent_id)
        summaries = []
        for child in parent.get("children", []):
            child_id = str(child.get("id", ""))
            summaries.append(
                {
                    "child_id": child_id,
                    "child_name": str(child.get("name", "")),
                    "grade": str(child.get("grade", "")),
                    "document_count": len(self._records_for_child("documents", parent_id, child_id)),
                    "practice_count": len(self._records_for_child("practice_attempts", parent_id, child_id)),
                    "portfolio_export_count": len(self._records_for_child("portfolio_exports", parent_id, child_id)),
                }
            )
        return summaries

    def record_audit_event(
        self,
        parent_id: str,
        event_type: str,
        child_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        record = {
            "id": f"audit-{uuid.uuid4().hex[:10]}",
            "parent_id": parent_id,
            "event_type": event_type,
            "child_id": child_id,
            "details": details or {},
            "created_at": now_iso(),
        }
        db = self.firestore
        if db is None:
            self._memory["audit_events"][record["id"]] = record
        else:
            db.collection("audit_events").document(record["id"]).set(record)
        return record

    def list_audit_events(self, parent_id: str, limit: int = 20) -> list[dict[str, Any]]:
        db = self.firestore
        if db is None:
            records = [
                dict(record)
                for record in self._memory["audit_events"].values()
                if record.get("parent_id") == parent_id
            ]
        else:
            records = [
                snapshot.to_dict() or {}
                for snapshot in db.collection("audit_events").where("parent_id", "==", parent_id).stream()
            ]
        records.sort(key=lambda record: str(record.get("created_at", "")), reverse=True)
        return records[:limit]

    def delete_child_data(self, parent_id: str, child_id: str, confirmation_name: str, delete_storage: bool = True) -> dict[str, Any]:
        parent = self.get_parent_with_children(parent_id)
        child = next((item for item in parent.get("children", []) if item.get("id") == child_id), None)
        if not child:
            raise ValueError("Child not found")
        if len(parent.get("children", [])) <= 1:
            raise ValueError("Cannot delete the only child profile")
        if str(child.get("name", "")).strip() != confirmation_name.strip():
            raise ValueError("Child name confirmation does not match")

        documents = self._records_for_child("documents", parent_id, child_id)
        practice_attempts = self._records_for_child("practice_attempts", parent_id, child_id)
        exports = self._records_for_child("portfolio_exports", parent_id, child_id)
        shared_reports = self._records_for_child("shared_reports", parent_id, child_id)
        storage_deleted = 0
        if delete_storage:
            for record in [*documents.values(), *exports.values()]:
                storage_uris = record.get("storage_uris") if isinstance(record.get("storage_uris"), list) else []
                storage_uri_values = [*storage_uris]
                if record.get("storage_uri"):
                    storage_uri_values.append(record["storage_uri"])
                for storage_uri in set(str(uri) for uri in storage_uri_values if uri):
                    storage_deleted += self.delete_storage_uri(str(storage_uri))

        db = self.firestore
        if db is None:
            self._memory["children"].pop(child_id, None)
            for record_id in documents:
                self._memory["documents"].pop(record_id, None)
            for record_id in practice_attempts:
                self._memory["practice_attempts"].pop(record_id, None)
            for record_id in exports:
                self._memory["portfolio_exports"].pop(record_id, None)
            for record_id in shared_reports:
                self._memory["shared_reports"].pop(record_id, None)
        else:
            db.collection("children").document(child_id).delete()
            for record_id in documents:
                db.collection("documents").document(record_id).delete()
            for record_id in practice_attempts:
                db.collection("practice_attempts").document(record_id).delete()
            for record_id in exports:
                db.collection("portfolio_exports").document(record_id).delete()
            for record_id in shared_reports:
                db.collection("shared_reports").document(record_id).delete()

        self.record_audit_event(
            parent_id,
            "child_data_deleted",
            child_id=child_id,
            details={
                "child_name": child.get("name"),
                "deleted_documents": len(documents),
                "deleted_practice_attempts": len(practice_attempts),
                "deleted_portfolio_exports": len(exports),
                "deleted_shared_reports": len(shared_reports),
                "deleted_storage_objects": storage_deleted,
            },
        )
        return {
            "parent": self.get_parent_with_children(parent_id),
            "deleted_child_id": child_id,
            "deleted_documents": len(documents),
            "deleted_practice_attempts": len(practice_attempts),
            "deleted_portfolio_exports": len(exports),
            "deleted_shared_reports": len(shared_reports),
            "deleted_storage_objects": storage_deleted,
        }

    def _records_for_child(self, collection: str, parent_id: str, child_id: str) -> dict[str, dict[str, Any]]:
        db = self.firestore
        if db is None:
            return {
                record_id: dict(record)
                for record_id, record in self._memory[collection].items()
                if record.get("parent_id") == parent_id and record.get("child_id") == child_id
            }
        return {
            snapshot.id: snapshot.to_dict() or {}
            for snapshot in (
                db.collection(collection)
                .where("parent_id", "==", parent_id)
                .where("child_id", "==", child_id)
                .stream()
            )
        }

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

    def delete_storage_uri(self, storage_uri: str) -> int:
        if storage_uri.startswith("file://"):
            path = Path(storage_uri.removeprefix("file://"))
            if path.exists():
                path.unlink()
                return 1
            return 0
        if not storage_uri.startswith("gs://") or self.storage is None:
            return 0
        bucket_name, blob_path = storage_uri.removeprefix("gs://").split("/", 1)
        blob = self.storage.bucket(bucket_name).blob(blob_path)
        if not blob.exists():
            return 0
        blob.delete()
        return 1

    def save_document(self, record: dict[str, Any]) -> dict[str, Any]:
        db = self.firestore
        if db is None:
            self._memory["documents"][record["id"]] = record
        else:
            db.collection("documents").document(record["id"]).set(record)
        return record

    def list_documents(self, parent_id: str, child_id: str) -> list[dict[str, Any]]:
        records = list(self._records_for_child("documents", parent_id, child_id).values())
        records.sort(key=lambda record: str(record.get("created_at", "")), reverse=True)
        return records

    def save_practice_attempt(self, record: dict[str, Any]) -> dict[str, Any]:
        db = self.firestore
        if db is None:
            self._memory["practice_attempts"][record["id"]] = record
        else:
            db.collection("practice_attempts").document(record["id"]).set(record)
        return record

    def list_practice_attempts(self, parent_id: str, child_id: str) -> list[dict[str, Any]]:
        records = list(self._records_for_child("practice_attempts", parent_id, child_id).values())
        records.sort(key=lambda record: str(record.get("created_at", "")), reverse=True)
        return records

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

    def save_shared_report(self, record: dict[str, Any]) -> dict[str, Any]:
        db = self.firestore
        if db is None:
            self._memory["shared_reports"][record["id"]] = record
        else:
            db.collection("shared_reports").document(record["id"]).set(record)
        return record

    def get_shared_report_by_token(self, token: str) -> dict[str, Any] | None:
        db = self.firestore
        if db is None:
            for record in self._memory["shared_reports"].values():
                if record.get("token") == token:
                    return dict(record)
            return None

        snapshots = db.collection("shared_reports").where("token", "==", token).limit(1).stream()
        for snapshot in snapshots:
            return snapshot.to_dict() or {}
        return None

    def list_shared_reports(self, parent_id: str, child_id: str) -> list[dict[str, Any]]:
        records = list(self._records_for_child("shared_reports", parent_id, child_id).values())
        records.sort(key=lambda record: str(record.get("created_at", "")), reverse=True)
        return records


persistence = Persistence()
