# Refactor Summary

Last updated: 2026-06-04 HKT

## Completed Changes

- Added GitHub Actions CI at `.github/workflows/ci.yml`.
  - Frontend job runs `npm ci`, `npm run build`, and `npm test`.
  - Backend job runs `pip install -r backend/requirements.txt`, `python -m pytest tests -q`, and `python -m py_compile backend/app/main.py backend/app/routers/*.py backend/app/services/*.py`.
- Added `pytest==8.3.4` to `backend/requirements.txt` so the backend CI job can run the specified pytest command from a clean runner.
- Split frontend API access into `src/api/client.ts` and `src/api/endpoints.ts`.
- Moved frontend shared types, assets, UI copy, and learning display helpers into `src/types/`, `src/config/`, `src/i18n/`, and `src/domain/`.
- Extracted shared React UI primitives and top-level views under `src/components/shared/` and `src/components/views/`.
- Added frontend tests for API client behavior, config/copy helpers, App smoke states, shared components, views, and hooks.
- Added `useToast` and `useLearningWorkspace`.
- Added `useLearningWorkspace` success/error tests for progress refresh, OCR inbox refresh, notebook/briefing/share refresh, and share error toast handling.
- Suppressed the expected `ErrorBoundary` render-error stderr noise inside its test so CI output stays readable while still asserting the boundary logs the error.
- Split the global CSS entry into ordered imports under `src/styles/`, preserving selector names and cascade order.
- Partially split backend code:
  - `backend/app/routers/account.py` owns auth, parent, privacy, audit log, and children endpoints.
  - `backend/app/services/ocr_review.py` owns OCR review prompt/parse helpers.
- Preserved existing UI/UX behavior and API endpoint paths/contracts.

## Validation Commands And Outputs

### Frontend install

Command:

```bash
npm ci
```

Output:

```text
added 119 packages, and audited 120 packages in 2s

26 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### Frontend build

Command:

```bash
npm run build
```

Output:

```text
> eduapp-prototype@0.1.0 build
> tsc && vite build

vite v8.0.14 building client environment for production...
transforming...✓ 42 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.85 kB │ gzip:  0.42 kB
dist/assets/index-B9TxIlvW.css   84.03 kB │ gzip: 13.67 kB
dist/assets/index-C1KowZsa.js   262.91 kB │ gzip: 83.09 kB

✓ built in 99ms
```

### Frontend tests

Command:

```bash
npm test
```

Output:

```text
> eduapp-prototype@0.1.0 test
> vitest run

RUN  v4.1.8 /Users/apple/Documents/eduapp

Test Files  21 passed (21)
Tests  32 passed (32)
Start at  11:44:39
Duration  5.47s (transform 2.99s, setup 5.59s, import 4.84s, tests 6.54s, environment 34.57s)
```

### Backend dependency install

Command:

```bash
.venv312/bin/python -m pip install -r backend/requirements.txt
```

Output:

```text
Requirement already satisfied: fastapi==0.115.6 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 1)) (0.115.6)
Requirement already satisfied: google-cloud-firestore==2.21.0 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 2)) (2.21.0)
Requirement already satisfied: google-cloud-storage==2.19.0 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 3)) (2.19.0)
Requirement already satisfied: google-cloud-vision==3.8.1 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 4)) (3.8.1)
Requirement already satisfied: google-genai==1.52.0 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 5)) (1.52.0)
Requirement already satisfied: pydantic==2.10.4 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 6)) (2.10.4)
Requirement already satisfied: pytest==8.3.4 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 7)) (8.3.4)
Requirement already satisfied: python-multipart==0.0.20 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 8)) (0.0.20)
Requirement already satisfied: reportlab==4.2.5 in ./.venv312/lib/python3.12/site-packages (from -r backend/requirements.txt (line 9)) (4.2.5)
Requirement already satisfied: uvicorn==0.32.1 in ./.venv312/lib/python3.12/site-packages (from uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (0.32.1)
Requirement already satisfied: starlette<0.42.0,>=0.40.0 in ./.venv312/lib/python3.12/site-packages (from fastapi==0.115.6->-r backend/requirements.txt (line 1)) (0.41.3)
Requirement already satisfied: typing-extensions>=4.8.0 in ./.venv312/lib/python3.12/site-packages (from fastapi==0.115.6->-r backend/requirements.txt (line 1)) (4.15.0)
Requirement already satisfied: google-api-core!=2.0.*,!=2.1.*,!=2.10.*,!=2.2.*,!=2.3.*,!=2.4.*,!=2.5.*,!=2.6.*,!=2.7.*,!=2.8.*,!=2.9.*,<3.0.0,>=1.34.0 in ./.venv312/lib/python3.12/site-packages (from google-api-core[grpc]!=2.0.*,!=2.1.*,!=2.10.*,!=2.2.*,!=2.3.*,!=2.4.*,!=2.5.*,!=2.6.*,!=2.7.*,!=2.8.*,!=2.9.*,<3.0.0,>=1.34.0->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (2.30.3)
Requirement already satisfied: google-auth!=2.24.0,!=2.25.0,<3.0.0,>=2.14.1 in ./.venv312/lib/python3.12/site-packages (from google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (2.53.0)
Requirement already satisfied: google-cloud-core<3.0.0,>=1.4.1 in ./.venv312/lib/python3.12/site-packages (from google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (2.6.0)
Requirement already satisfied: proto-plus<2.0.0,>=1.22.0 in ./.venv312/lib/python3.12/site-packages (from google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (1.28.0)
Requirement already satisfied: protobuf!=3.20.0,!=3.20.1,!=4.21.0,!=4.21.1,!=4.21.2,!=4.21.3,!=4.21.4,!=4.21.5,<7.0.0dev,>=3.20.2 in ./.venv312/lib/python3.12/site-packages (from google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (5.29.6)
Requirement already satisfied: google-resumable-media>=2.7.2 in ./.venv312/lib/python3.12/site-packages (from google-cloud-storage==2.19.0->-r backend/requirements.txt (line 3)) (2.9.0)
Requirement already satisfied: requests<3.0.0dev,>=2.18.0 in ./.venv312/lib/python3.12/site-packages (from google-cloud-storage==2.19.0->-r backend/requirements.txt (line 3)) (2.34.2)
Requirement already satisfied: google-crc32c<2.0dev,>=1.0 in ./.venv312/lib/python3.12/site-packages (from google-cloud-storage==2.19.0->-r backend/requirements.txt (line 3)) (1.8.0)
Requirement already satisfied: anyio<5.0.0,>=4.8.0 in ./.venv312/lib/python3.12/site-packages (from google-genai==1.52.0->-r backend/requirements.txt (line 5)) (4.13.0)
Requirement already satisfied: httpx<1.0.0,>=0.28.1 in ./.venv312/lib/python3.12/site-packages (from google-genai==1.52.0->-r backend/requirements.txt (line 5)) (0.28.1)
Requirement already satisfied: tenacity<9.2.0,>=8.2.3 in ./.venv312/lib/python3.12/site-packages (from google-genai==1.52.0->-r backend/requirements.txt (line 5)) (9.1.4)
Requirement already satisfied: websockets<15.1.0,>=13.0.0 in ./.venv312/lib/python3.12/site-packages (from google-genai==1.52.0->-r backend/requirements.txt (line 5)) (15.0.1)
Requirement already satisfied: annotated-types>=0.6.0 in ./.venv312/lib/python3.12/site-packages (from pydantic==2.10.4->-r backend/requirements.txt (line 6)) (0.7.0)
Requirement already satisfied: pydantic-core==2.27.2 in ./.venv312/lib/python3.12/site-packages (from pydantic==2.10.4->-r backend/requirements.txt (line 6)) (2.27.2)
Requirement already satisfied: iniconfig in ./.venv312/lib/python3.12/site-packages (from pytest==8.3.4->-r backend/requirements.txt (line 7)) (2.3.0)
Requirement already satisfied: packaging in ./.venv312/lib/python3.12/site-packages (from pytest==8.3.4->-r backend/requirements.txt (line 7)) (26.2)
Requirement already satisfied: pluggy<2,>=1.5 in ./.venv312/lib/python3.12/site-packages (from pytest==8.3.4->-r backend/requirements.txt (line 7)) (1.6.0)
Requirement already satisfied: pillow>=9.0.0 in ./.venv312/lib/python3.12/site-packages (from reportlab==4.2.5->-r backend/requirements.txt (line 9)) (12.2.0)
Requirement already satisfied: chardet in ./.venv312/lib/python3.12/site-packages (from reportlab==4.2.5->-r backend/requirements.txt (line 9)) (7.4.3)
Requirement already satisfied: click>=7.0 in ./.venv312/lib/python3.12/site-packages (from uvicorn==0.32.1->uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (8.4.1)
Requirement already satisfied: h11>=0.8 in ./.venv312/lib/python3.12/site-packages (from uvicorn==0.32.1->uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (0.16.0)
Requirement already satisfied: httptools>=0.6.3 in ./.venv312/lib/python3.12/site-packages (from uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (0.8.0)
Requirement already satisfied: python-dotenv>=0.13 in ./.venv312/lib/python3.12/site-packages (from uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (1.2.2)
Requirement already satisfied: pyyaml>=5.1 in ./.venv312/lib/python3.12/site-packages (from uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (6.0.3)
Requirement already satisfied: uvloop!=0.15.0,!=0.15.1,>=0.14.0 in ./.venv312/lib/python3.12/site-packages (from uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (0.22.1)
Requirement already satisfied: watchfiles>=0.13 in ./.venv312/lib/python3.12/site-packages (from uvicorn[standard]==0.32.1->-r backend/requirements.txt (line 10)) (1.2.0)
Requirement already satisfied: idna>=2.8 in ./.venv312/lib/python3.12/site-packages (from anyio<5.0.0,>=4.8.0->google-genai==1.52.0->-r backend/requirements.txt (line 5)) (3.17)
Requirement already satisfied: googleapis-common-protos<2.0.0,>=1.63.2 in ./.venv312/lib/python3.12/site-packages (from google-api-core!=2.0.*,!=2.1.*,!=2.10.*,!=2.2.*,!=2.3.*,!=2.4.*,!=2.5.*,!=2.6.*,!=2.7.*,!=2.8.*,!=2.9.*,<3.0.0,>=1.34.0->google-api-core[grpc]!=2.0.*,!=2.1.*,!=2.10.*,!=2.2.*,!=2.3.*,!=2.4.*,!=2.5.*,!=2.6.*,!=2.7.*,!=2.8.*,!=2.9.*,<3.0.0,>=1.34.0->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (1.75.0)
Requirement already satisfied: grpcio<2.0.0,>=1.33.2 in ./.venv312/lib/python3.12/site-packages (from google-api-core[grpc]!=2.0.*,!=2.1.*,!=2.10.*,!=2.2.*,!=2.3.*,!=2.4.*,!=2.5.*,!=2.6.*,!=2.7.*,!=2.8.*,!=2.9.*,<3.0.0,>=1.34.0->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (1.80.0)
Requirement already satisfied: grpcio-status<2.0.0,>=1.33.2 in ./.venv312/lib/python3.12/site-packages (from google-api-core[grpc]!=2.0.*,!=2.1.*,!=2.10.*,!=2.2.*,!=2.3.*,!=2.4.*,!=2.5.*,!=2.6.*,!=2.7.*,!=2.8.*,!=2.9.*,<3.0.0,>=1.34.0->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (1.71.2)
Requirement already satisfied: pyasn1-modules>=0.2.1 in ./.venv312/lib/python3.12/site-packages (from google-auth!=2.24.0,!=2.25.0,<3.0.0,>=2.14.1->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (0.4.2)
Requirement already satisfied: cryptography>=38.0.3 in ./.venv312/lib/python3.12/site-packages (from google-auth!=2.24.0,!=2.25.0,<3.0.0,>=2.14.1->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (48.0.0)
Requirement already satisfied: certifi in ./.venv312/lib/python3.12/site-packages (from httpx<1.0.0,>=0.28.1->google-genai==1.52.0->-r backend/requirements.txt (line 5)) (2026.5.20)
Requirement already satisfied: httpcore==1.* in ./.venv312/lib/python3.12/site-packages (from httpx<1.0.0,>=0.28.1->google-genai==1.52.0->-r backend/requirements.txt (line 5)) (1.0.9)
Requirement already satisfied: charset_normalizer<4,>=2 in ./.venv312/lib/python3.12/site-packages (from requests<3.0.0dev,>=2.18.0->google-cloud-storage==2.19.0->-r backend/requirements.txt (line 3)) (3.4.7)
Requirement already satisfied: urllib3<3,>=1.26 in ./.venv312/lib/python3.12/site-packages (from requests<3.0.0dev,>=2.18.0->google-cloud-storage==2.19.0->-r backend/requirements.txt (line 3)) (2.7.0)
Requirement already satisfied: cffi>=2.0.0 in ./.venv312/lib/python3.12/site-packages (from cryptography>=38.0.3->google-auth!=2.24.0,!=2.25.0,<3.0.0,>=2.14.1->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (2.0.0)
Requirement already satisfied: pyasn1<0.7.0,>=0.6.1 in ./.venv312/lib/python3.12/site-packages (from pyasn1-modules>=0.2.1->google-auth!=2.24.0,!=2.25.0,<3.0.0,>=2.14.1->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (0.6.3)
Requirement already satisfied: pycparser in ./.venv312/lib/python3.12/site-packages (from cffi>=2.0.0->cryptography>=38.0.3->google-auth!=2.24.0,!=2.25.0,<3.0.0,>=2.14.1->google-cloud-firestore==2.21.0->-r backend/requirements.txt (line 2)) (3.0)

[notice] A new release of pip is available: 25.0.1 -> 26.1.2
[notice] To update, run: /Users/apple/Documents/eduapp/.venv312/bin/python -m pip install --upgrade pip
```

### Backend tests

Command:

```bash
.venv312/bin/python -m pytest tests -q
```

Output:

```text
.........................                                                [100%]
=============================== warnings summary ===============================
.venv312/lib/python3.12/site-packages/reportlab/lib/rl_safe_eval.py:12
  /Users/apple/Documents/eduapp/.venv312/lib/python3.12/site-packages/reportlab/lib/rl_safe_eval.py:12: DeprecationWarning: ast.NameConstant is deprecated and will be removed in Python 3.14; use ast.Constant instead
    haveNameConstant = hasattr(ast,'NameConstant')

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
25 passed, 1 warning in 1.48s
```

### Backend compile

Command:

```bash
.venv312/bin/python -m py_compile backend/app/main.py backend/app/routers/*.py backend/app/services/*.py
```

Output:

```text
# no output; command exited successfully
```

## Remaining Debt

- `src/App.tsx` is still 1401 lines and remains the app wiring layer for auth, upload/OCR, practice, portfolio, and cross-view flow.
- `backend/app/main.py` is still 1731 lines.
- Backend splitting is partial, not complete. Only account/privacy/children routes and OCR prompt/parse helpers were moved in this refactor.
- CSS is split by ordered global files under `src/styles/`; it is not yet CSS Modules.

## Next PR Scope

- Split the remaining backend routes into `routers/ocr_review.py`, `routers/practice.py`, `routers/learning.py`, `routers/reports.py`, and `routers/portfolio.py`.
- Move quiz prompt/fallback/normalization into `services/practice_service.py`.
- Move OCR route upload/confirm/delete logic into `services/ocr_review_service.py`, keeping existing endpoint paths unchanged.
- Extract remaining `App.tsx` state into `useAuth`, `useOcrReview`, `usePractice`, `usePortfolio`, and `usePrivacy`.
- Start converting new component/view CSS to CSS Modules gradually.
