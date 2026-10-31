import os

from app import main
from tests.conftest import SECRET, register_and_login, upload


def stored_files():
    root = os.path.realpath(main.UPLOAD_DIR)
    out = []
    for dirpath, _, files in os.walk(root):
        out += [os.path.realpath(os.path.join(dirpath, f)) for f in files]
    return root, out


def test_traversal_filename_stays_inside_upload_store(client):
    a = register_and_login(client, "a@example.com")
    r = client.post("/documents/upload", headers=a, files={"file": ("../evil.txt", SECRET.encode(), "text/plain")})
    assert r.status_code == 200, r.text
    assert r.json()["filename"] == "../evil.txt"

    root, files = stored_files()
    assert len(files) == 1
    assert files[0].startswith(root + os.sep)
    assert not os.path.exists(os.path.join(os.path.dirname(root), "evil.txt"))


def test_same_filename_twice_keeps_both_files(client):
    a = register_and_login(client, "a@example.com")
    first = upload(client, a, name="report.txt")
    upload(client, a, name="report.txt")
    assert len(stored_files()[1]) == 2

    # Deleting one must not delete the other's file.
    assert client.delete(f"/documents/{first}", headers=a).status_code == 204
    assert len(stored_files()[1]) == 1
