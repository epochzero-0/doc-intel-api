#!/bin/bash
# Deletes everything setup.sh created, in dependency order, so the bill goes to zero.
# Run from the repo root: infra/teardown.sh
# The S3 bucket holds the uploads and the nightly backups; download what you want first:
#   aws s3 cp s3://<bucket>/backups/ ./backups --recursive
set -uo pipefail # no -e: keep going past anything already deleted
cd "$(dirname "$0")" || exit 1
. ./config.sh

read -r -p "Delete all $APP resources in $AWS_REGION for account $ACCOUNT_ID? Type 'delete': " ok
[ "$ok" = "delete" ] || exit 1

# 1. CloudFront: must be disabled and fully deployed before it can be deleted (~5-15 min).
dist=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$APP-api'].Id | [0]" --output text)
if [ -n "$dist" ] && [ "$dist" != "None" ]; then
  etag=$(aws cloudfront get-distribution-config --id "$dist" --query ETag --output text)
  aws cloudfront get-distribution-config --id "$dist" --query DistributionConfig --output json \
    | sed 's/"Enabled": true/"Enabled": false/' > .cf-disable.tmp.json
  aws cloudfront update-distribution --id "$dist" --if-match "$etag" --distribution-config file://.cf-disable.tmp.json >/dev/null
  rm -f .cf-disable.tmp.json
  echo "waiting for CloudFront to disable..."
  aws cloudfront wait distribution-deployed --id "$dist"
  etag=$(aws cloudfront get-distribution-config --id "$dist" --query ETag --output text)
  aws cloudfront delete-distribution --id "$dist" --if-match "$etag" && echo "deleted CloudFront $dist"
fi

# 2. EC2 instance (its root volume and the Postgres volume on it go with it), then the Elastic IP.
iid=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=$APP-api" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text)
if [ -n "$iid" ]; then
  aws ec2 terminate-instances --instance-ids $iid >/dev/null
  aws ec2 wait instance-terminated --instance-ids $iid && echo "terminated $iid"
fi
alloc=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=$APP-api" --query 'Addresses[0].AllocationId' --output text)
[ "$alloc" != "None" ] && aws ec2 release-address --allocation-id "$alloc" && echo "released Elastic IP"

# 3. Security group.
sg=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" --query 'SecurityGroups[0].GroupId' --output text)
[ "$sg" != "None" ] && aws ec2 delete-security-group --group-id "$sg" && echo "deleted security group"

# 4. IAM: instance profile and role, deploy user and its access key.
aws iam remove-role-from-instance-profile --instance-profile-name "$INSTANCE_ROLE" --role-name "$INSTANCE_ROLE" 2>/dev/null
aws iam delete-instance-profile --instance-profile-name "$INSTANCE_ROLE" 2>/dev/null
aws iam delete-role-policy --role-name "$INSTANCE_ROLE" --policy-name "$APP-app" 2>/dev/null
aws iam detach-role-policy --role-name "$INSTANCE_ROLE" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore 2>/dev/null
aws iam delete-role --role-name "$INSTANCE_ROLE" 2>/dev/null && echo "deleted $INSTANCE_ROLE"
for k in $(aws iam list-access-keys --user-name "$DEPLOY_USER" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null); do
  aws iam delete-access-key --user-name "$DEPLOY_USER" --access-key-id "$k"
done
aws iam delete-user-policy --user-name "$DEPLOY_USER" --policy-name "$APP-deploy" 2>/dev/null
aws iam delete-user --user-name "$DEPLOY_USER" 2>/dev/null && echo "deleted $DEPLOY_USER and its access key"

# 5. ECR repository and its images.
aws ecr delete-repository --repository-name "$ECR_REPO" --force >/dev/null 2>&1 && echo "deleted ECR $ECR_REPO"

# 6. S3 bucket: uploads and backups.
aws s3 rb "s3://$BUCKET" --force 2>/dev/null && echo "deleted bucket $BUCKET"

# 7. SSM parameters and the log group.
for p in POSTGRES_PASSWORD DATABASE_URL JWT_SECRET_KEY OPENAI_API_KEY S3_BUCKET; do
  aws ssm delete-parameter --name "$SSM_PREFIX/$p" 2>/dev/null
done
echo "deleted SSM parameters"
aws logs delete-log-group --log-group-name "$LOG_GROUP" 2>/dev/null && echo "deleted log group"

# 8. GitHub repo variables and secrets, so the deploy job goes back to skipping (needs gh; run
#    these from your PC if teardown runs in CloudShell).
for v in ECR_REGISTRY EC2_INSTANCE_ID API_URL; do
  gh variable delete "$v" --repo "$GH_REPO" 2>/dev/null
done
for s in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  gh secret delete "$s" --repo "$GH_REPO" 2>/dev/null
done

# 9. The budget last, so it watches the whole teardown.
aws budgets delete-budget --account-id "$ACCOUNT_ID" --budget-name "$APP-monthly" 2>/dev/null && echo "deleted budget"
echo "done. Check Billing > Bills next month shows US\$0."
