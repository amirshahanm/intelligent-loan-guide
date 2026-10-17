#!/bin/sh
set -eu
umask 077
mkdir -p /opt/tashilradar/backups
chmod 700 /opt/tashilradar/backups
key=/opt/tashilradar/secrets/backup.key
if [ ! -f "$key" ]; then openssl rand -hex 32 > "$key"; chmod 600 "$key"; fi
stamp=$(date -u +%Y%m%dT%H%M%SZ)
# A temporary dump remains protected until encryption succeeds. Never discard the
# only recoverable backup on an encryption failure.
docker exec tashilradar-postgres pg_dump -U tashilradar_admin -d tashilradar -Fc > /opt/tashilradar/backups/"$stamp".dump
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass file:"$key" \
  -in /opt/tashilradar/backups/"$stamp".dump -out /opt/tashilradar/backups/"$stamp".dump.enc
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass file:"$key" \
  -in /opt/tashilradar/backups/"$stamp".dump.enc -out /opt/tashilradar/backups/"$stamp".verify
cmp /opt/tashilradar/backups/"$stamp".dump /opt/tashilradar/backups/"$stamp".verify
rm /opt/tashilradar/backups/"$stamp".dump /opt/tashilradar/backups/"$stamp".verify
printf 'encrypted_backup_verified=%s.dump.enc\n' "$stamp"
