#!/bin/sh
set -eu
release=/opt/tashilradar/releases/release-20261009-04
config=/opt/shahan-growth/Caddyfile
test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3187/)" = 200
test "$(grep -c 'reverse_proxy tashilradar-web-20261009-02:3000' "$config")" = 1
cp "$config" "$release/Caddyfile.before"
sed 's/reverse_proxy tashilradar-web-20261009-02:3000/reverse_proxy tashilradar-web-20261009-04:3000/' "$config" > "$release/Caddyfile.candidate"
docker cp "$release/Caddyfile.candidate" shahan-growth-caddy-1:/tmp/tashilradar-candidate.Caddyfile >/dev/null
docker exec shahan-growth-caddy-1 caddy validate --config /tmp/tashilradar-candidate.Caddyfile --adapter caddyfile
cp "$release/Caddyfile.candidate" "$config"
if ! docker exec shahan-growth-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
  cp "$release/Caddyfile.before" "$config"
  docker exec shahan-growth-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  exit 1
fi
printf 'tashilradar_release_20261009_04_activated=true\n'
