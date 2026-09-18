# Secret-link static deployment

This deployment publishes selected student-facing material to a VPS without usernames or passwords. Each student receives a cryptographically random URL token. The token map is never committed to Git.

## Public layout

A student with token `TOKEN` receives the URL:

`https://study.example.com/TOKEN/`

The generated redirect opens `/TOKEN/site/`. This deliberately preserves the repository's existing relative links:

- `../pdf_docs/...` -> `/TOKEN/pdf_docs/...`
- `../tex_docs/...` -> `/TOKEN/tex_docs/...`
- `../../../shared/...` -> `/shared/...`

The build publishes only an allowlist from each mapped student:

- `site/`
- `pdf_docs/`
- `tex_docs/`
- `review_docs/`
- `images/`
- student root image assets
- the same student-facing directories under `chemistry/`, when present

It also publishes the shared browser runtimes `shared/student-dashboard/` and `shared/practice/`. Other repository directories are excluded.

## 1. Generate URL tokens locally

Generate tokens only for students who should be deployed:

```bash
node deploy/student-static/generate-url-map.mjs kristina darya_savenkova grisha_arkhipov
```

Or generate/preserve mappings for every student that has `site/index.html`:

```bash
node deploy/student-static/generate-url-map.mjs --all
```

The mapping is written to `.student-url-map.local.json` with restrictive file permissions and is ignored by Git. Re-running the generator preserves existing tokens.

Do not paste the mapping into source files, PRs, issues, Actions logs, or Caddy configuration.

## 2. Prepare the VPS

Use a dedicated unprivileged deployment account, for example `students-deploy`. It needs SSH access and ownership of the deployment directory only:

```bash
sudo useradd --create-home --shell /bin/bash students-deploy
sudo install -d -o students-deploy -g students-deploy /srv/students-site/releases
```

Install the deployment public key in `/home/students-deploy/.ssh/authorized_keys`. The corresponding private key becomes the GitHub Actions secret `VPS_SSH_KEY`.

Caddy should serve `/srv/students-site/current`. Merge `Caddyfile.example` into the server's existing Caddy configuration, replace the example hostname, then validate before reload:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The example adds `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, disables directory browsing by omission, returns 404 at the hostname root, and blocks repository-style internal paths.

## 3. Configure GitHub

Create a `production` environment if desired, then configure:

Repository/environment secrets:

- `STUDENT_URL_MAP` — the complete JSON from `.student-url-map.local.json`
- `VPS_SSH_KEY` — private deployment key
- `VPS_KNOWN_HOSTS` — trusted `known_hosts` line(s) for the VPS; do not use `StrictHostKeyChecking=no`

Repository variables:

- `VPS_HOST` — VPS hostname or IP
- `VPS_USER` — normally `students-deploy`
- `VPS_PORT` — optional, defaults to `22`
- `ENABLE_VPS_DEPLOY` — keep unset/false until the server is ready; set to `true` to enable production deployment

The workflow never uploads the built site as a public GitHub artifact and does not print token paths.

## 4. First deployment and cutover

Recommended order:

1. Keep the existing GitHub Pages site online.
2. Point a dedicated hostname, for example `study.example.com`, to the VPS.
3. Configure Caddy and verify HTTPS.
4. Add GitHub secrets/variables while `ENABLE_VPS_DEPLOY` is still false.
5. Set `ENABLE_VPS_DEPLOY=true` and run **Student static deployment** manually.
6. Verify several secret URLs, lesson pages, PDFs, TeX links, shared dashboard assets, and mobile rendering.
7. Give students the new secret URLs.
8. After cutover, make the repository private and disable the old GitHub Pages publication if it remains available.

## 5. Rotate one student's URL

Generate a new 24-byte random token for that student, replace only that entry in `STUDENT_URL_MAP`, and deploy again. Because each release is rebuilt from the current mapping, the old token disappears from the new release.

## Rollback

Each deployment creates `/srv/students-site/releases/<commit-sha>` and atomically repoints `/srv/students-site/current`. The five newest releases are kept. To roll back, repoint `current` to a previous release:

```bash
ln -sfn /srv/students-site/releases/<previous-sha> /srv/students-site/current.next
mv -Tf /srv/students-site/current.next /srv/students-site/current
```
