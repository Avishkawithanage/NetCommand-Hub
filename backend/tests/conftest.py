from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.loader import load_store
from app.main import create_app

DATA = Path(__file__).resolve().parents[2] / "data"


@pytest.fixture(scope="session")
def store():
    return load_store(DATA)


@pytest.fixture(scope="session")
def client():
    with TestClient(create_app(), raise_server_exceptions=False) as c:
        yield c
