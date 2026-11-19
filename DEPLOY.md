# Deploying to meja.doncorleonez.my.id

Same setup as `shikoku.doncorleonez.my.id`:

```
visitor ──HTTPS──▶ Cloudflare ──Tunnel──▶ cloudflared on VPS ──▶ 127.0.0.1:8190 (nginx: landing page + /meja-*/ games)
```

The landing page links Hot Streak, Splendor and Sky Team on this site (`/meja-hotstreak/` and so on) and Shikoku on `https://shikoku.doncorleonez.my.id/`.
`games/` holds the prebuilt games, so the VPS needs no Node and no access to the private game repos. `games/BUILD_INFO.txt` records which commit each build came from.

## Part 1: VPS (prompt for Hermes)

> **Task: run the Meja site on my VPS at 127.0.0.1:8190.**
> 1. `git clone https://github.com/DonCorleonez/meja.git && cd meja`. If the repo is private, use the same GitHub access the VPS already uses.
> 2. Check that port 8190 is free (`ss -ltn | grep 8190`). If it is taken, run with `MEJA_PORT=<free port>` and tell me the port.
> 3. `docker compose up -d --build`
> 4. Verify:
>    - `curl -sI http://127.0.0.1:8190/` → 200
>    - `curl -sI http://127.0.0.1:8190/meja-hotstreak/` → 200
>    - `curl -sI http://127.0.0.1:8190/meja-hotstreak/sw.js | grep -i cache-control` → no-cache
>    - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8190/meja-hotstreak/assets/missing.js` → 404
> 5. Don't touch the shikoku containers or other services. Report the port and the curl results.
>
> To update later: `git pull && docker compose up -d --build`.

## Part 2: Cloudflare Tunnel (prompt for Muse)

> **Task: publish meja.doncorleonez.my.id through my existing Cloudflare Tunnel.**
> The same tunnel already serves `shikoku.doncorleonez.my.id` (→ localhost:8189). A new site now runs on the VPS at **http://localhost:8190** (or the port Hermes reported).
> 1. Add a public hostname/ingress rule `meja.doncorleonez.my.id → http://localhost:8190` on the **same** tunnel, using the same method and host address as the shikoku route. Keep the 404 catch-all last, and don't change existing routes.
> 2. Create the DNS record for `meja` (the dashboard does this automatically; otherwise run `cloudflared tunnel route dns`).
> 3. SSL/TLS Full or Flexible. No Cloudflare Access. **Rocket Loader off.** Don't cache-override HTML or `sw.js`; nginx already sends the right headers.
> 4. Verify `curl -sI https://meja.doncorleonez.my.id/` and `https://meja.doncorleonez.my.id/meja-splendor/` both return 200.
>
> Report what you changed and the results.

## After it's live

- Open the site on a phone, tap each "Main" button, and install one game. Turn on airplane mode and reopen it: it should still work.
- Updating the games: `scripts/build-games.sh ../meja-hotstreak ../meja-splendor ../meja-skyteam`, commit `games/`, then on the VPS run `git pull && docker compose up -d --build`.
- Rollback: `git revert` the bad commit and redeploy.
- Note: the site is public. The Shikoku rules content is shared with permission for 18xx.games only (see 1889-shikoku/DEPLOY.md), so keep it for personal play.
