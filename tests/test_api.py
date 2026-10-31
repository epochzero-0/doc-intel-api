from datetime import datetime, timedelta

from jose import jwt

from tests.conftest import SECRET, register_and_login, upload


def forge(email, key):
    exp = datetime.utcnow() + timedelta(minutes=30)
    return {"Authorization": f"Bearer {jwt.encode({'sub': email, 'exp': exp}, key, algorithm='HS256')}"}


# --- auth ---------------------------------------------------------------------

def test_register_and_login_return_token(client):
    headers = register_and_login(client, "a@example.com")
    r = client.get("/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "a@example.com"


def test_wrong_password_is_401(client):
    register_and_login(client, "a@example.com")
    r = client.post("/auth/login", data={"username": "a@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_token_signed_with_public_literal_key_is_rejected(client):
    # "KEY" was the hardcoded signing key in this public repo.
    register_and_login(client, "victim@example.com")
    r = client.get("/users/me", headers=forge("victim@example.com", "KEY"))
    assert r.status_code == 401


def test_token_signed_with_other_key_is_rejected(client):
    register_and_login(client, "victim@example.com")
    r = client.get("/users/me", headers=forge("victim@example.com", "attacker-chosen-key"))
    assert r.status_code == 401


# --- chat context ----------------------------------------------------------------

# Long enough for several 800-character chunks; each part is tagged so a chunk can be identified.
LONG_DOC = " ".join(f"part{i:02d} " + "lorem ipsum dolor sit amet " * 6 for i in range(40))


def test_scoped_chat_leads_with_opening_chunks_and_returns_what_it_used(client):
    a = register_and_login(client, "a@example.com")
    doc_id = upload(client, a, name="annex.txt", body=LONG_DOC)

    meta = client.post("/documents/chat", headers=a, json={"query": "what is this about", "document_id": doc_id}).json()["metadata"]
    chunks = meta["chunks"]

    assert [c["reason"] for c in chunks[:2]] == ["opening", "opening"]
    assert [c["chunk_index"] for c in chunks[:2]] == [0, 1]
    assert all(c["reason"] == "match" for c in chunks[2:])
    assert len(chunks) <= 5
    assert len({c["chunk_index"] for c in chunks}) == len(chunks), "an opener matched by search must not repeat"
    assert chunks[0]["content"].startswith("part00")
    assert meta["total_chunks_found"] == len(chunks)


def test_unscoped_chat_uses_matches_only(client):
    a = register_and_login(client, "a@example.com")
    upload(client, a, name="annex.txt", body=LONG_DOC)

    chunks = client.post("/documents/chat", headers=a, json={"query": "what is this about"}).json()["metadata"]["chunks"]
    assert len(chunks) == 3
    assert all(c["reason"] == "match" for c in chunks)


def test_chunks_are_numbered_in_the_order_the_model_saw_them(client):
    # The test double for generate_answer echoes the chunks it was given, in order.
    a = register_and_login(client, "a@example.com")
    doc_id = upload(client, a, name="annex.txt", body=LONG_DOC)

    r = client.post("/documents/chat", headers=a, json={"query": "anything", "document_id": doc_id}).json()
    assert r["answer"].split("\n") == [c["content"] for c in r["metadata"]["chunks"]]


# --- tenant isolation ---------------------------------------------------------

def test_user_b_cannot_reach_user_a_document(client):
    a = register_and_login(client, "a@example.com")
    b = register_and_login(client, "b@example.com")
    doc_id = upload(client, a)
    assert client.get(f"/documents/{doc_id}/status", headers=a).json()["status"] == "completed"

    assert client.get("/documents", headers=b).json() == []

    hits = client.post("/documents/search", headers=b, json={"query": "launch code"}).json()
    assert hits == []

    chat = client.post("/documents/chat", headers=b, json={"query": "launch code", "document_id": doc_id}).json()
    assert "pineapple" not in chat["answer"]
    assert chat["metadata"]["sources"] == []
    assert chat["metadata"]["chunks"] == []  # opening chunks of A's document must not leak either

    assert client.get(f"/documents/{doc_id}/status", headers=b).status_code == 404
    assert client.delete(f"/documents/{doc_id}", headers=b).status_code == 404

    # A's document survived B's attempts and is still A's.
    assert [d["id"] for d in client.get("/documents", headers=a).json()] == [doc_id]
    assert client.post("/documents/search", headers=a, json={"query": "launch code"}).json()[0]["document_id"] == doc_id
