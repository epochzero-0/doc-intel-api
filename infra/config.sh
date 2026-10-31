# Shared names for setup.sh and teardown.sh. Sourced, not run.
# The account's project setup only allows its selected region (plus us-east-1/us-west-2 for global services).
export AWS_REGION=ap-southeast-2
export AWS_DEFAULT_REGION=$AWS_REGION
export AWS_PAGER=""
set -o pipefail
# aws.exe on Windows ends lines with CRLF; strip the \r so captured IDs are clean.
aws() { command aws "$@" | tr -d '\r'; }

APP=docintel
GH_REPO=epochzero-0/doc-intel-api
ECR_REPO=docintel-api
SSM_PREFIX=/docintel
LOG_GROUP=/docintel/api
INSTANCE_TYPE=t4g.micro
ROOT_GB=16
BUDGET_USD=5

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET=$APP-$ACCOUNT_ID-$AWS_REGION
INSTANCE_ROLE=$APP-instance
DEPLOY_USER=$APP-github-deploy
SG_NAME=$APP-api
