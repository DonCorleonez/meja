# Deploying to meja.doncorleonez.my.id

Same setup as `shikoku.doncorleonez.my.id`:

```
visitor ──HTTPS──▶ Cloudflare ──Tunnel──▶ cloudflared on VPS ──▶ 127.0.0.1:8190
                                                                 └ nginx (container meja-web):
                                                                   /              landing page
                                                                   /meja-hotstreak/  /meja-splendor/  /meja-skyteam/
```

The landing page links Hot Streak, Splendor and Sky Team on this site, and Shikoku 1889 on `https://shikoku.doncorleonez.my.id/`.
`games/` holds the prebuilt games, so the VPS needs no Node and no access to the private game repos. `games/BUILD_INFO.txt` records which branch and commit each build came from.

## Accounts and repos

| What | Value |
|---|---|
| GitHub account | **DonCorleonez** (`https://github.com/DonCorleonez`) |
| Deploy repo | **`DonCorleonez/meja`**, **public**, default branch `main` |
| Clone URL (no login needed once public) | `https://github.com/DonCorleonez/meja.git` |
| Game source repos (stay private) | `DonCorleonez/meja-hotstreak`, `meja-splendor`, `meja-skyteam` (branch `redesign-karnaval`) |
| Shikoku repo (already live, don't touch) | `DonCorleonez/1889-shikoku` → `shikoku.doncorleonez.my.id` (port 8189) |
| Domain | `doncorleonez.my.id` on Cloudflare, existing tunnel also serving `kanban` and `shikoku` |
| New hostname | `meja.doncorleonez.my.id` → `http://localhost:8190` |

**Why public:** the VPS can `git clone` and `git pull` without a token or deploy key. The site itself is public anyway. Only `index.html` and the built game files (minified JS/CSS) become visible. The game **source** repos stay private. The repo can be made private later. If you do, the VPS then needs a read-only deploy key for `pull`.

## Step 0: GitHub (owner, done once)

1. Signed in as **DonCorleonez**, create a new repository:
   - Name: `meja`
   - Visibility: **Public**
   - **Don't** add a README, .gitignore or license (the repo must be empty).
2. Push the prepared repo from this machine (Claude does this once the repo exists):
   ```bash
   git push -u origin main
   ```
3. Check that `https://github.com/DonCorleonez/meja` opens without logging in.

## Step 1: VPS (prompt for Hermes)

> **Task: run the Meja site on my VPS at 127.0.0.1:8190.**
> The code is in the public repo `https://github.com/DonCorleonez/meja` (GitHub account DonCorleonez). No credentials are needed to clone it.
> 1. Next to the existing `1889-shikoku` folder: `git clone https://github.com/DonCorleonez/meja.git && cd meja`
> 2. Check that port 8190 is free (`ss -ltn | grep ':8190'`). If it is taken, run the next step as `MEJA_PORT=<free port> docker compose up -d --build` and tell me the port.
> 3. `docker compose up -d --build`. This builds a small nginx:alpine image, with no Node and no long build.
> 4. Verify on the VPS:
>    - `curl -sI http://127.0.0.1:8190/ | head -1` → `200`
>    - `curl -sI http://127.0.0.1:8190/meja-hotstreak/ | head -1` → `200` (same for `/meja-splendor/`, `/meja-skyteam/`)
>    - `curl -sI http://127.0.0.1:8190/meja-hotstreak/sw.js | grep -i cache-control` → `no-cache`
>    - `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8190/meja-hotstreak/assets/missing.js` → `404`
> 5. Don't touch the shikoku or kanban containers, or any other service. Report the port, `docker compose ps`, and the curl results.
>
> Update later: `cd meja && git pull && docker compose up -d --build`.

## Step 2: Cloudflare (prompt for Muse)

> **Task: publish `meja.doncorleonez.my.id` through my existing Cloudflare Tunnel.**
>
> **Context**
> - Cloudflare zone: `doncorleonez.my.id`. One Cloudflare Tunnel already runs on my VPS and serves `kanban.doncorleonez.my.id` and `shikoku.doncorleonez.my.id` (→ `localhost:8189`).
> - A new static site now runs on the same VPS in Docker at **`http://localhost:8190`** (container `meja-web`, nginx, bound to 127.0.0.1). If Hermes reported a different port, use that one.
> - Source: public GitHub repo `https://github.com/DonCorleonez/meja` (account DonCorleonez). You don't need to change anything on GitHub.
>
> **Do**
> 1. **Find how the tunnel is managed, by looking at how the `shikoku` route was added:**
>    - *Dashboard-managed* (Zero Trust → Networks → Tunnels shows "Remotely managed", or `cloudflared` runs with `--token`), or
>    - *Locally managed* (`/etc/cloudflared/config.yml` or `~/.cloudflared/config.yml` with an `ingress:` list).
> 2. **Add one route on the same tunnel.** Don't create a new tunnel, and don't edit or reorder the existing routes.
>    - Dashboard: Tunnel → *Public Hostname* → *Add a public hostname*: subdomain `meja`, domain `doncorleonez.my.id`, path empty, type `HTTP`, URL `localhost:8190`. This creates the DNS record automatically.
>    - config.yml: add this rule directly above the final `- service: http_status:404`:
>      ```yaml
>      - hostname: meja.doncorleonez.my.id
>        service: http://localhost:8190
>      ```
>      Then run `cloudflared tunnel ingress validate`, `cloudflared tunnel route dns <tunnel-name-or-id> meja.doncorleonez.my.id`, and restart cloudflared (`sudo systemctl restart cloudflared`, or restart its container).
>    - **If cloudflared runs in a Docker container**, use the exact same host address the `shikoku` route uses (for example `http://host.docker.internal:8190` or `http://172.17.0.1:8190`). Don't use `localhost` in that case. Tell me which one you used.
> 3. **DNS:** `meja` must be a proxied (orange cloud) CNAME to `<tunnel-id>.cfargotunnel.com`. If an old `meja` A/AAAA/CNAME record already exists, tell me before replacing it.
> 4. **Settings for this hostname. Don't change zone-wide settings that other subdomains depend on.**
>    - SSL/TLS mode Full or Flexible (the origin is plain HTTP through the tunnel). Always Use HTTPS on.
>    - **Rocket Loader off** (it breaks the games' JavaScript), and **no Email Obfuscation or HTML minify** for this hostname.
>    - **No Cache Rules that override the origin's cache headers** for `meja.doncorleonez.my.id`. nginx already sends `no-cache` for HTML, `sw.js` and the manifest, and a 1-year immutable cache for `/meja-*/assets/`. If a zone-wide "Cache Everything" rule exists, add a bypass for this hostname.
>    - No Cloudflare Access / login in front of it.
>
> **Verify and report**
> - `curl -sI https://meja.doncorleonez.my.id/ | head -1` → `200`
> - `curl -sI https://meja.doncorleonez.my.id/meja-hotstreak/ | head -1` → `200` (same for `/meja-splendor/` and `/meja-skyteam/`)
> - `curl -sI https://meja.doncorleonez.my.id/meja-hotstreak/sw.js | grep -i cache-control` → contains `no-cache`
> - `https://shikoku.doncorleonez.my.id/` and `https://kanban.doncorleonez.my.id/` still work as before.
> - Report what you changed (tunnel route, DNS record, any config file edits, any rules) and the verification results.

## After it's live

- On a phone: open the site, tap each "Main" button (Shikoku opens in its own subdomain), and install one game. Turn on airplane mode and reopen it: it should still work.
- **Update the games:** merge `redesign-karnaval` (or later work) in each game repo, then run `scripts/build-games.sh ../meja-hotstreak ../meja-splendor ../meja-skyteam`. Commit and push `games/`, then on the VPS run `git pull && docker compose up -d --build`. Visitors get the new version on their next visit; the service worker no longer shows a blank screen after updates.
- **Rollback:** `git revert <sha>`, push, then `git pull && docker compose up -d --build` on the VPS.
- **Shikoku note:** per `1889-shikoku/DEPLOY.md`, the 18xx game titles are licensed for 18xx.games. Keep the Shikoku link for personal play.
