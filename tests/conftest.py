import os
import tempfile

# Set before any app import: the app reads these at import time, and load_dotenv()
# never overrides a variable that is already set, so a local .env can't point tests
# at a real database.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://test:test@localhost:55432/test"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["JWT_SECRET_KEY"] = "test-secret-not-used-anywhere-else"
os.environ["OPENAI_API_KEY"] = "sk-test-never-called"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app import main
from app.database import Base, engine
from app.storage import LocalStorage

FAKE_VECTOR = [0.1] * 1536


@pytest.fixture(autouse=True)
def fresh_db():
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def no_openai(monkeypatch):
    monkeypatch.setattr(main, "get_embedding", lambda text: FAKE_VECTOR)
    monkeypatch.setattr(main, "generate_answer", lambda query, chunks: "\n".join(c.content for c in chunks))


@pytest.fixture(autouse=True)
def upload_root(monkeypatch):
    # The store is a subdirectory, so a write that escapes it lands in a directory
    # the test can see.
    root = os.path.join(tempfile.mkdtemp(prefix="docintel-"), "store")
    monkeypatch.setattr(main, "storage", LocalStorage(root))
    return root


@pytest.fixture
def client():
    return TestClient(main.app)


def register_and_login(client, email, password="pw-123456"):
    r = client.post("/auth/register", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


SECRET = "the launch code is pineapple"


def upload(client, headers, name="notes.txt", body=SECRET):
    r = client.post("/documents/upload", headers=headers, files={"file": (name, body.encode(), "text/plain")})
    assert r.status_code == 200, r.text
    return r.json()["id"]
