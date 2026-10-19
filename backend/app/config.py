"""Runtime configuration (environment variables, all optional)."""

from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("NCH_DATA_DIR", ROOT / "data"))
FRONTEND_DIST = Path(os.environ.get("NCH_FRONTEND_DIST", ROOT / "frontend" / "dist"))
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("NCH_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
MAX_BODY_BYTES = int(os.environ.get("NCH_MAX_BODY_BYTES", "1000000"))
