import os

import boto3
from moto import mock_aws

from app.entrypoint import load_ssm


@mock_aws
def test_load_ssm_sets_env_from_parameter_names(monkeypatch):
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-southeast-1")
    monkeypatch.delenv("SOME_SECRET", raising=False)
    ssm = boto3.client("ssm", region_name="ap-southeast-1")
    ssm.put_parameter(Name="/docintel/SOME_SECRET", Value="s3cr3t", Type="SecureString")
    ssm.put_parameter(Name="/other/SOME_SECRET", Value="wrong", Type="SecureString")

    load_ssm("/docintel")

    assert os.environ["SOME_SECRET"] == "s3cr3t"
