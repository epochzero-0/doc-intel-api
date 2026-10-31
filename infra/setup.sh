#!/bin/bash
# Creates the AWS side of doc-intel in ap-southeast-2 (config.sh). Run from the repo root in
# AWS CloudShell, or in Git Bash after `aws login`, one step at a time or "all":
#
#   infra/setup.sh budget you@example.com
#   infra/setup.sh storage      # ECR repo, S3 bucket, log group
#   infra/setup.sh secrets      # SSM parameters (prompts for the OpenAI key)
#   infra/setup.sh iam          # instance role
#   infra/setup.sh instance     # security group, EC2, Elastic IP
#   infra/setup.sh cdn          # CloudFront
#   infra/setup.sh github       # deploy user and its access key, prints the GitHub repo variables
#
# Only "instance" starts anything that bills by the hour.
set -euo pipefail
cd "$(dirname "$0")"
. ./config.sh

step_budget() {
  local email="${1:?usage: setup.sh budget <email>}"
  aws budgets create-budget --account-id "$ACCOUNT_ID" \
    --budget "{\"BudgetName\":\"$APP-monthly\",\"BudgetLimit\":{\"Amount\":\"$BUDGET_USD\",\"Unit\":\"USD\"},\"TimeUnit\":\"MONTHLY\",\"BudgetType\":\"COST\"}" \
    --notifications-with-subscribers "[
      {\"Notification\":{\"NotificationType\":\"ACTUAL\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":100,\"ThresholdType\":\"PERCENTAGE\"},\"Subscribers\":[{\"SubscriptionType\":\"EMAIL\",\"Address\":\"$email\"}]},
      {\"Notification\":{\"NotificationType\":\"FORECASTED\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":100,\"ThresholdType\":\"PERCENTAGE\"},\"Subscribers\":[{\"SubscriptionType\":\"EMAIL\",\"Address\":\"$email\"}]}]"
  echo "budget: US\$$BUDGET_USD/month, emails $email"
}

step_storage() {
  aws ecr describe-repositories --repository-names "$ECR_REPO" >/dev/null 2>&1 \
    || aws ecr create-repository --repository-name "$ECR_REPO" --image-scanning-configuration scanOnPush=true >/dev/null
  aws ecr put-lifecycle-policy --repository-name "$ECR_REPO" --lifecycle-policy-text \
    '{"rules":[{"rulePriority":1,"description":"keep last 5","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":5},"action":{"type":"expire"}}]}' >/dev/null

  if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
    aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration \
    '{"Rules":[{"ID":"expire-backups","Status":"Enabled","Filter":{"Prefix":"backups/"},"Expiration":{"Days":14}}]}'

  aws logs create-log-group --log-group-name "$LOG_GROUP" 2>/dev/null || true
  aws logs put-retention-policy --log-group-name "$LOG_GROUP" --retention-in-days 14
  echo "storage: ECR $ECR_REPO, S3 $BUCKET, logs $LOG_GROUP"
}

put_param() { # name value type
  aws ssm put-parameter --name "$SSM_PREFIX/$1" --value "$2" --type "$3" --overwrite >/dev/null
}

step_secrets() {
  local pg jwt openai
  pg=$(openssl rand -hex 24)
  jwt=$(openssl rand -hex 32)
  read -r -s -p "OpenAI API key (not echoed): " openai; echo
  [ -n "$openai" ] || { echo "empty key"; exit 1; }
  put_param POSTGRES_PASSWORD "$pg" SecureString
  put_param DATABASE_URL "postgresql://docintel:$pg@db:5432/docintel" SecureString
  put_param JWT_SECRET_KEY "$jwt" SecureString
  put_param OPENAI_API_KEY "$openai" SecureString
  put_param S3_BUCKET "$BUCKET" String
  echo "secrets: written under $SSM_PREFIX (values not shown)"
}

step_iam() {
  aws iam get-role --role-name "$INSTANCE_ROLE" >/dev/null 2>&1 || aws iam create-role --role-name "$INSTANCE_ROLE" \
    --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  # Lets the CD job run commands on the instance through SSM.
  aws iam attach-role-policy --role-name "$INSTANCE_ROLE" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
  aws iam put-role-policy --role-name "$INSTANCE_ROLE" --policy-name "$APP-app" --policy-document "{
    \"Version\":\"2012-10-17\",\"Statement\":[
      {\"Effect\":\"Allow\",\"Action\":[\"ssm:GetParametersByPath\",\"ssm:GetParameter\"],
       \"Resource\":[\"arn:aws:ssm:$AWS_REGION:$ACCOUNT_ID:parameter$SSM_PREFIX\",\"arn:aws:ssm:$AWS_REGION:$ACCOUNT_ID:parameter$SSM_PREFIX/*\"]},
      {\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\"],
       \"Resource\":\"arn:aws:s3:::$BUCKET/uploads/*\"},
      {\"Effect\":\"Allow\",\"Action\":\"s3:PutObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/backups/*\"},
      {\"Effect\":\"Allow\",\"Action\":\"ecr:GetAuthorizationToken\",\"Resource\":\"*\"},
      {\"Effect\":\"Allow\",\"Action\":[\"ecr:BatchGetImage\",\"ecr:GetDownloadUrlForLayer\",\"ecr:BatchCheckLayerAvailability\"],
       \"Resource\":\"arn:aws:ecr:$AWS_REGION:$ACCOUNT_ID:repository/$ECR_REPO\"},
      {\"Effect\":\"Allow\",\"Action\":[\"logs:CreateLogStream\",\"logs:PutLogEvents\",\"logs:DescribeLogStreams\"],
       \"Resource\":\"arn:aws:logs:$AWS_REGION:$ACCOUNT_ID:log-group:$LOG_GROUP:*\"}]}"
  aws iam get-instance-profile --instance-profile-name "$INSTANCE_ROLE" >/dev/null 2>&1 || {
    aws iam create-instance-profile --instance-profile-name "$INSTANCE_ROLE" >/dev/null
    aws iam add-role-to-instance-profile --instance-profile-name "$INSTANCE_ROLE" --role-name "$INSTANCE_ROLE"
    sleep 15 # new instance profiles take a moment before EC2 accepts them
  }
  echo "iam: role and instance profile $INSTANCE_ROLE"
}

instance_id() {
  aws ec2 describe-instances --filters "Name=tag:Name,Values=$APP-api" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' --output text
}

step_instance() {
  local vpc sg pl ud iid alloc
  vpc=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
  sg=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$vpc" --query 'SecurityGroups[0].GroupId' --output text)
  if [ "$sg" = "None" ]; then
    sg=$(aws ec2 create-security-group --group-name "$SG_NAME" --description "docintel api: port 80 from CloudFront only" --vpc-id "$vpc" --query GroupId --output text)
    # The only inbound rule: HTTP from CloudFront's origin-facing ranges. No SSH; use SSM Session Manager.
    pl=$(aws ec2 describe-managed-prefix-lists --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing --query 'PrefixLists[0].PrefixListId' --output text)
    aws ec2 authorize-security-group-ingress --group-id "$sg" --ip-permissions \
      "IpProtocol=tcp,FromPort=80,ToPort=80,PrefixListIds=[{PrefixListId=$pl,Description=CloudFront}]" >/dev/null
  fi

  iid=$(instance_id)
  if [ -z "$iid" ]; then
    ud=.user-data.tmp # relative: aws.exe can't read Git Bash /tmp paths
    { echo '#!/bin/bash'; echo "REGION=$AWS_REGION SSM_PREFIX=$SSM_PREFIX LOG_GROUP=$LOG_GROUP"; echo "export REGION SSM_PREFIX LOG_GROUP"; cat host/bootstrap.sh; } > "$ud"
    iid=$(aws ec2 run-instances \
      --image-id resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64 \
      --instance-type "$INSTANCE_TYPE" \
      --credit-specification CpuCredits=standard \
      --iam-instance-profile Name="$INSTANCE_ROLE" \
      --security-group-ids "$sg" \
      --metadata-options HttpTokens=required,HttpPutResponseHopLimit=2,HttpEndpoint=enabled \
      --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=$ROOT_GB,VolumeType=gp3,Encrypted=true,DeleteOnTermination=true}" \
      --user-data "file://$ud" \
      --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP-api}]" \
      --query 'Instances[0].InstanceId' --output text)
    rm -f "$ud"
    aws ec2 wait instance-running --instance-ids "$iid"
  fi

  alloc=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=$APP-api" --query 'Addresses[0].AllocationId' --output text)
  if [ "$alloc" = "None" ]; then
    alloc=$(aws ec2 allocate-address --domain vpc --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$APP-api}]" --query AllocationId --output text)
  fi
  aws ec2 associate-address --instance-id "$iid" --allocation-id "$alloc" >/dev/null
  echo "instance: $iid ($INSTANCE_TYPE), bootstrap log at /var/log/docintel-bootstrap.log"
}

step_cdn() {
  local iid dns existing cfg
  iid=$(instance_id)
  dns=$(aws ec2 describe-instances --instance-ids "$iid" --query 'Reservations[0].Instances[0].PublicDnsName' --output text)
  existing=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$APP-api'].DomainName | [0]" --output text)
  if [ "$existing" != "None" ]; then echo "cdn: https://$existing"; return; fi
  cfg=.cloudfront.tmp.json
  # CachingDisabled + AllViewerExceptHostHeader: every request reaches the API,
  # Authorization header included.
  cat > "$cfg" <<EOF
{
  "CallerReference": "$APP-$(date +%s)",
  "Comment": "$APP-api",
  "Enabled": true,
  "PriceClass": "PriceClass_200",
  "Origins": {"Quantity": 1, "Items": [{
    "Id": "ec2", "DomainName": "$dns",
    "CustomOriginConfig": {"HTTPPort": 80, "HTTPSPort": 443, "OriginProtocolPolicy": "http-only",
      "OriginReadTimeout": 60, "OriginKeepaliveTimeout": 5,
      "OriginSslProtocols": {"Quantity": 1, "Items": ["TLSv1.2"]}}}]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "ec2",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {"Quantity": 7, "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
      "CachedMethods": {"Quantity": 2, "Items": ["GET","HEAD"]}},
    "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    "OriginRequestPolicyId": "b689b0a8-53d0-40ab-baf2-68738e2966ac",
    "Compress": true
  }
}
EOF
  aws cloudfront create-distribution --distribution-config "file://$cfg" --query 'Distribution.DomainName' --output text
  rm -f "$cfg"
  echo "cdn: created; takes a few minutes to deploy"
}

step_github() {
  # This account type blocks IAM identity providers (iam:*Provider*), so GitHub OIDC is
  # unavailable. The deploy job uses an IAM user's access key instead, scoped to pushing
  # this one ECR repo and running commands on this one instance.
  local iid cf
  aws iam get-user --user-name "$DEPLOY_USER" >/dev/null 2>&1 || aws iam create-user --user-name "$DEPLOY_USER" >/dev/null

  iid=$(instance_id)
  aws iam put-user-policy --user-name "$DEPLOY_USER" --policy-name "$APP-deploy" --policy-document "{
    \"Version\":\"2012-10-17\",\"Statement\":[
      {\"Effect\":\"Allow\",\"Action\":\"ecr:GetAuthorizationToken\",\"Resource\":\"*\"},
      {\"Effect\":\"Allow\",\"Action\":[\"ecr:BatchCheckLayerAvailability\",\"ecr:InitiateLayerUpload\",\"ecr:UploadLayerPart\",
        \"ecr:CompleteLayerUpload\",\"ecr:PutImage\",\"ecr:BatchGetImage\",\"ecr:GetDownloadUrlForLayer\"],
       \"Resource\":\"arn:aws:ecr:$AWS_REGION:$ACCOUNT_ID:repository/$ECR_REPO\"},
      {\"Effect\":\"Allow\",\"Action\":\"ssm:SendCommand\",\"Resource\":[
        \"arn:aws:ssm:$AWS_REGION::document/AWS-RunShellScript\",
        \"arn:aws:ec2:$AWS_REGION:$ACCOUNT_ID:instance/$iid\"]},
      {\"Effect\":\"Allow\",\"Action\":\"ssm:GetCommandInvocation\",\"Resource\":\"*\"}]}"

  cf=$(aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='$APP-api'].DomainName | [0]" --output text)
  echo "github: deploy user $DEPLOY_USER ready. Repo variables to set:"
  echo "  ECR_REGISTRY=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
  echo "  EC2_INSTANCE_ID=$iid"
  echo "  API_URL=https://$cf"
  if [ "$(aws iam list-access-keys --user-name "$DEPLOY_USER" --query 'length(AccessKeyMetadata)' --output text)" = "0" ]; then
    echo "Access key for the GitHub secrets AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (shown once):"
    aws iam create-access-key --user-name "$DEPLOY_USER" \
      --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
  fi
}

case "${1:-}" in
  budget)   step_budget "${2:-}" ;;
  storage)  step_storage ;;
  secrets)  step_secrets ;;
  iam)      step_iam ;;
  instance) step_instance ;;
  cdn)      step_cdn ;;
  github)   step_github ;;
  all)      step_budget "${2:-}"; step_storage; step_secrets; step_iam; step_instance; step_cdn; step_github ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
