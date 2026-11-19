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

**Why public:** the VPS can `git clone` and `git pull` without a token or deploy key. The site itself is public anyway. Only `index.html` and the built game files (minified JS/CSS) become visible. The game **source** repos stay private.

## Step 0: GitHub (owner, done once)

1. Signed in as **DonCorleonez**: repo `meja` → **Settings → General → Danger Zone → Change visibility → Change to public**. Complete every confirmation.
2. Check in a private/incognito window that `https://github.com/DonCorleonez/meja` opens **without** logging in.

## Step 1: VPS + Cloudflare (one prompt for Muse)

Paste this to Muse:

> **Task: put the Meja site live at `https://meja.doncorleonez.my.id`. Run it on my VPS with Docker and publish it through my existing Cloudflare Tunnel.**
>
> **Context**
> - VPS: the same server that already runs `1889-shikoku` (Docker, `127.0.0.1:8189`) and `cloudflared` for my Cloudflare Tunnel.
> - Cloudflare zone `doncorleonez.my.id`. The tunnel already serves `kanban.doncorleonez.my.id` and `shikoku.doncorleonez.my.id`.
> - Code: GitHub account **DonCorleonez**, public repo **`https://github.com/DonCorleonez/meja`** (branch `main`). It contains a ready nginx site: `Dockerfile`, `docker-compose.yml`, `nginx.conf`, and prebuilt files. No Node, no build secrets, no `.env` needed.
> - Target: container `meja-web` on **`127.0.0.1:8190`**, published as **`meja.doncorleonez.my.id`**.
>
> **Part A: VPS**
> 1. Check that the repo is reachable without credentials: `git ls-remote https://github.com/DonCorleonez/meja.git`. If this asks for a login or says "not found", **stop and tell me**: the repo is still private. Don't add tokens or keys.
> 2. In the same parent folder as `1889-shikoku`: `git clone https://github.com/DonCorleonez/meja.git && cd meja`
> 3. Check that port 8190 is free: `ss -ltn | grep ':8190'`. If it is taken, use another free port in the next step and in Part B, via `MEJA_PORT=<port> docker compose up -d --build`.
> 4. `docker compose up -d --build`. This builds a small nginx:alpine image in seconds.
> 5. Verify locally on the VPS:
>    - `docker compose ps` → `meja-web` running (healthy)
>    - `curl -sI http://127.0.0.1:8190/ | head -1` → `200`
>    - `curl -sI http://127.0.0.1:8190/meja-hotstreak/ | head -1` → `200` (same for `/meja-splendor/` and `/meja-skyteam/`)
>    - `curl -sI http://127.0.0.1:8190/meja-hotstreak/sw.js | grep -i cache-control` → `no-cache`
>    - `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8190/meja-hotstreak/assets/missing.js` → `404`
> 6. Don't touch the shikoku or kanban containers, or any other service.
>
> **Part B: Cloudflare Tunnel** (only after Part A passes)
> 1. **Find how the tunnel is managed, by looking at how the `shikoku` route was added:**
>    - *Dashboard-managed*: Zero Trust → Networks → Tunnels shows "Remotely managed", or `cloudflared` runs with `--token`.
>    - *Locally managed*: `/etc/cloudflared/config.yml` or `~/.cloudflared/config.yml` with an `ingress:` list.
> 2. **Add one route on the same tunnel.** Don't create a new tunnel, and don't edit or reorder existing routes.
>    - Dashboard: Tunnel → *Public Hostname* → *Add*: subdomain `meja`, domain `doncorleonez.my.id`, path empty, type `HTTP`, URL `localhost:8190`. This creates the DNS record.
>    - config.yml: add this rule directly above the final `- service: http_status:404`:
>      ```yaml
>      - hostname: meja.doncorleonez.my.id
>        service: http://localhost:8190
>      ```
>      Then run `cloudflared tunnel ingress validate`, `cloudflared tunnel route dns <tunnel-name-or-id> meja.doncorleonez.my.id`, and restart cloudflared (`sudo systemctl restart cloudflared`, or restart its container).
>    - **If cloudflared runs in a Docker container**, use the same host address the `shikoku` route uses (for example `http://host.docker.internal:8190` or `http://172.17.0.1:8190`), not `localhost`. Note that `meja-web` is bound to 127.0.0.1 like shikoku: if the shikoku route needed a different binding, apply the same approach and tell me what you did.
> 3. **DNS:** `meja` must be a proxied (orange cloud) CNAME to `<tunnel-id>.cfargotunnel.com`. If an old `meja` record already exists, tell me before replacing it.
> 4. **Settings for this hostname only.** Don't change zone-wide settings that other subdomains rely on.
>    - SSL/TLS Full or Flexible. Always Use HTTPS on.
>    - **Rocket Loader off**, no Email Obfuscation, and no HTML auto-minify for this hostname.
>    - **No Cache Rules that override origin headers** for `meja.doncorleonez.my.id`. nginx already sends `no-cache` for HTML, `sw.js` and the manifest, and a 1-year immutable cache for `/meja-*/assets/`. If a zone-wide "Cache Everything" rule exists, add a bypass for this hostname.
>    - No Cloudflare Access / login in front of it.
>
> **Verify and report**
> - `curl -sI https://meja.doncorleonez.my.id/ | head -1` → `200`
> - `curl -sI https://meja.doncorleonez.my.id/meja-hotstreak/ | head -1` → `200` (same for `/meja-splendor/` and `/meja-skyteam/`)
> - `curl -sI https://meja.doncorleonez.my.id/meja-hotstreak/sw.js | grep -i cache-control` → contains `no-cache`
> - `https://shikoku.doncorleonez.my.id/` and `https://kanban.doncorleonez.my.id/` still work.
> - Report: the port used, `docker compose ps`, the tunnel route and DNS record you added, any config file edits or rules, and all the curl results.
>
> **Later updates:** `cd meja && git pull && docker compose up -d --build`. The tunnel route stays as it is.

## After it's live

- On a phone: open the site, tap each "Main" button (Shikoku opens in its own subdomain), and install one game. Turn on airplane mode and reopen it: it should still work.
- **Update the games:** merge `redesign-karnaval` (or later work) in each game repo, then run `scripts/build-games.sh ../meja-hotstreak ../meja-splendor ../meja-skyteam`. Commit and push `games/`, then on the VPS run `git pull && docker compose up -d --build`. Visitors get the new version on their next visit without a blank screen.
- **Rollback:** `git revert <sha>`, push, then on the VPS run `git pull && docker compose up -d --build`.
- **Shikoku note:** per `1889-shikoku/DEPLOY.md`, the 18xx game titles are licensed for 18xx.games. Keep the Shikoku link for personal play.
