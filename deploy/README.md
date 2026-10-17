# Isolated Node deployment

The default build remains Cloudflare-compatible. For VPS or a Node container,
set `TASHILRADAR_RUNTIME_TARGET=node` and
`VITE_TASHILRADAR_DEPLOYMENT_MODE=production` in the build environment, then run
the existing build command. Never include secrets in the build environment or image.

Build the runtime image from the repository root with `deploy/Dockerfile`.
The image contains only the built `.output` directory, runs as an unprivileged
user and uses port 3000. Inject necessary secrets at runtime through the host's
protected configuration, never through VITE variables.

For an initial private canary, publish only a free loopback port, cap memory and
CPU, and do not attach a public reverse proxy or change DNS. Keep production
provider mode; unavailable capabilities must not simulate real responses.

Public cutover additionally requires the production quality gate, runtime UX
and security checks, truthful catalog/provider behavior and an explicit rollback
point. A successful private canary is not a production-readiness declaration.

Keep the existing briefing Worker and unrelated containers/networks untouched.
Rollback an initial private canary by stopping only its named container; preserve
its release directory for inspection. For later upgrades keep previous images
and restore only the product's own reverse-proxy configuration if necessary.
