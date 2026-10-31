#!/bin/bash
# EC2 user-data for Amazon Linux 2023 (arm64). Runs once, as root, on first boot.
# setup.sh prepends REGION, SSM_PREFIX and LOG_GROUP before uploading it.
set -euo pipefail
exec > >(tee /var/log/docintel-bootstrap.log) 2>&1

: "${REGION:?}" "${SSM_PREFIX:?}" "${LOG_GROUP:?}"

# 1 GB of RAM holds Postgres plus two gunicorn workers only with swap behind it.
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

dnf install -y docker
systemctl enable --now docker

mkdir -p /opt/docintel
cat > /opt/docintel/env <<EOF
REGION=$REGION
SSM_PREFIX=$SSM_PREFIX
LOG_GROUP=$LOG_GROUP
EOF

param() { aws ssm get-parameter --region "$REGION" --name "$SSM_PREFIX/$1" --with-decryption --query Parameter.Value --output text; }

# --- Postgres + pgvector -------------------------------------------------------
# On a user-defined network with no -p flag: reachable as "db" from the api
# container, never from outside the instance.
docker network inspect docintel >/dev/null 2>&1 || docker network create docintel
docker volume create pgdata >/dev/null
if ! docker container inspect db >/dev/null 2>&1; then
  docker run -d --name db --network docintel --restart unless-stopped \
    -v pgdata:/var/lib/postgresql/data \
    -e POSTGRES_USER=docintel -e POSTGRES_DB=docintel \
    -e POSTGRES_PASSWORD="$(param POSTGRES_PASSWORD)" \
    --log-driver awslogs --log-opt awslogs-region="$REGION" \
    --log-opt awslogs-group="$LOG_GROUP" --log-opt awslogs-stream=db \
    pgvector/pgvector:pg16
fi
until docker exec db pg_isready -U docintel >/dev/null 2>&1; do sleep 2; done
sleep 3
docker exec db psql -U docintel -d docintel -c 'CREATE EXTENSION IF NOT EXISTS vector;'

# --- deploy: called by the CD job through SSM send-command ---------------------
cat > /opt/docintel/deploy.sh <<'EOF'
#!/bin/bash
# Usage: deploy.sh <account>.dkr.ecr.<region>.amazonaws.com/docintel-api:<sha>
set -euo pipefail
. /opt/docintel/env
IMAGE="$1"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${IMAGE%%/*}"
docker pull "$IMAGE"
docker rm -f api 2>/dev/null || true
docker run -d --name api --network docintel --restart unless-stopped -p 80:8000 \
  -e SSM_PREFIX="$SSM_PREFIX" -e AWS_REGION="$REGION" -e AWS_DEFAULT_REGION="$REGION" \
  --log-driver awslogs --log-opt awslogs-region="$REGION" \
  --log-opt awslogs-group="$LOG_GROUP" --log-opt awslogs-stream=api \
  "$IMAGE"
for i in $(seq 1 30); do
  if curl -sf http://localhost/ >/dev/null; then
    echo "api healthy on $IMAGE"
    docker image prune -af --filter "until=72h" >/dev/null || true
    exit 0
  fi
  sleep 2
done
echo "api did not come up"; docker logs --tail 50 api; exit 1
EOF

# --- nightly pg_dump to S3 -----------------------------------------------------
cat > /opt/docintel/backup.sh <<'EOF'
#!/bin/bash
set -euo pipefail
. /opt/docintel/env
BUCKET=$(aws ssm get-parameter --region "$REGION" --name "$SSM_PREFIX/S3_BUCKET" --query Parameter.Value --output text)
docker exec db pg_dump -U docintel -Fc docintel \
  | aws s3 cp - "s3://$BUCKET/backups/docintel-$(date -u +%F).dump" --region "$REGION"
EOF
chmod +x /opt/docintel/*.sh

cat > /etc/systemd/system/docintel-backup.service <<'EOF'
[Unit]
Description=pg_dump docintel to S3
[Service]
Type=oneshot
ExecStart=/opt/docintel/backup.sh
EOF
cat > /etc/systemd/system/docintel-backup.timer <<'EOF'
[Unit]
Description=Nightly docintel backup
[Timer]
OnCalendar=*-*-* 19:00:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now docintel-backup.timer

echo "bootstrap done"
