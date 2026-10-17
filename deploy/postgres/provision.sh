#!/bin/sh
set -eu
umask 077
secrets=/opt/tashilradar/secrets
mkdir -p "$secrets"
chmod 700 "$secrets"
if [ ! -f "$secrets/postgres.env" ]; then
  password=$(openssl rand -hex 32)
  printf 'POSTGRES_USER=tashilradar_admin\nPOSTGRES_DB=tashilradar\nPOSTGRES_PASSWORD=%s\n' "$password" > "$secrets/postgres.env"
fi
if [ ! -f "$secrets/postgres-app.password" ]; then
  openssl rand -hex 32 > "$secrets/postgres-app.password"
fi
docker network inspect tashilradar_data >/dev/null 2>&1 || docker network create --internal tashilradar_data >/dev/null
docker volume inspect tashilradar_pgdata >/dev/null 2>&1 || docker volume create tashilradar_pgdata >/dev/null
if ! docker container inspect tashilradar-postgres >/dev/null 2>&1; then
  docker run -d --name tashilradar-postgres --restart unless-stopped \
    --network tashilradar_data --memory 384m --cpus 0.5 --pids-limit 128 \
    --security-opt no-new-privileges:true --env-file "$secrets/postgres.env" \
    --mount source=tashilradar_pgdata,target=/var/lib/postgresql/data \
    --health-cmd 'pg_isready -U tashilradar_admin -d tashilradar' \
    --health-interval 10s --health-timeout 3s --health-retries 6 \
    postgres@sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777 \
    -c shared_buffers=64MB -c max_connections=30 -c log_statement=none -c log_min_error_statement=panic >/dev/null
fi
attempt=0
until docker exec tashilradar-postgres pg_isready -U tashilradar_admin -d tashilradar >/dev/null 2>&1; do
  attempt=$((attempt+1)); [ "$attempt" -lt 30 ] || exit 1; sleep 1
done
password=$(cat "$secrets/postgres-app.password")
# Password stays inside this host's protected stdin; it is never returned to the operator.
printf "SELECT 'CREATE ROLE tashilradar_app LOGIN PASSWORD ''%s''' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='tashilradar_app') \\gexec\n" "$password" |
  docker exec -i tashilradar-postgres psql -X -q -v ON_ERROR_STOP=1 -U tashilradar_admin -d tashilradar >/dev/null
if [ ! -f "$secrets/backend.env" ]; then
  fingerprint=$(openssl rand -hex 32)
  printf 'TASHILRADAR_BACKEND=postgres\nTASHILRADAR_DATABASE_URL=postgresql://tashilradar_app:%s@tashilradar-postgres:5432/tashilradar\nTASHILRADAR_REQUEST_FINGERPRINT_SECRET=%s\n' "$password" "$fingerprint" > "$secrets/backend.env"
fi
chmod 600 "$secrets/postgres.env" "$secrets/postgres-app.password" "$secrets/backend.env"
printf 'isolated_postgres_ready=true\npublic_database_port=false\n'
