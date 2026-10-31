"""Container entrypoint: load secrets from SSM Parameter Store, then exec the server.

With SSM_PREFIX=/docintel, a SecureString /docintel/JWT_SECRET_KEY becomes the env var
JWT_SECRET_KEY. Credentials come from the EC2 instance role; nothing is baked into
the image. Without SSM_PREFIX (local runs), the environment is used as is.
"""
import os
import sys


def load_ssm(prefix: str) -> None:
    import boto3

    ssm = boto3.client("ssm")
    pages = ssm.get_paginator("get_parameters_by_path").paginate(
        Path=prefix, WithDecryption=True
    )
    for page in pages:
        for p in page["Parameters"]:
            os.environ[p["Name"].rsplit("/", 1)[-1]] = p["Value"]


if __name__ == "__main__":
    prefix = os.getenv("SSM_PREFIX")
    if prefix:
        load_ssm(prefix)
    workers = os.getenv("WEB_CONCURRENCY", "2")
    port = os.getenv("PORT", "8000")
    argv = ["gunicorn", "-w", workers, "-k", "uvicorn.workers.UvicornWorker",
            "app.main:app", "--bind", f"0.0.0.0:{port}", "--timeout", "120"]
    sys.stdout.flush()
    os.execvp(argv[0], argv)
