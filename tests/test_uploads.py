import os

import boto3
from moto import mock_aws

from app import main
from app.storage import S3Storage
from tests.conftest import SECRET, register_and_login, upload


def stored_files():
    root = os.path.realpath(main.storage.root)
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


@mock_aws
def test_s3_backend_upload_process_delete(client, monkeypatch):
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-southeast-1")
    s3 = boto3.client("s3", region_name="ap-southeast-1")
    s3.create_bucket(Bucket="docintel-test", CreateBucketConfiguration={"LocationConstraint": "ap-southeast-1"})
    monkeypatch.setattr(main, "storage", S3Storage("docintel-test"))

    a = register_and_login(client, "a@example.com")
    doc_id = upload(client, a, name="../notes.txt")
    keys = [o["Key"] for o in s3.list_objects_v2(Bucket="docintel-test").get("Contents", [])]
    assert len(keys) == 1 and keys[0].startswith("uploads/1/") and keys[0].endswith(".txt")

    # The background task read the object back from S3 and embedded it.
    assert client.get(f"/documents/{doc_id}/status", headers=a).json()["status"] == "completed"

    assert client.delete(f"/documents/{doc_id}", headers=a).status_code == 204
    assert s3.list_objects_v2(Bucket="docintel-test").get("KeyCount") == 0
