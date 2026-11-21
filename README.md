# Meja — landing page

Static landing page that links to every Meja board game. There is no build step and no dependencies.

- `index.html`: page. The game list is the `GAMES` array in the inline script. Set `url` to a path (for example `/meja-shikoku/`) to make a game playable, or to `null` to show "Segera hadir".
- `icon.svg`, `manifest.webmanifest`: icon and install metadata.
- `.github/workflows/pages.yml`: deploys to GitHub Pages when the repo variable `ENABLE_PAGES` is `true`.

Game links use absolute paths (`/meja-hotstreak/`), so they work when this page and the games are on the same Pages domain, whether the page is at the root (`<user>.github.io`) or under `/meja/`.

Preview locally with any static server, for example `npx vite .` in this folder.

## Contributors

Project owner **[@DonCorleonez](https://github.com/DonCorleonez)**, with AI collaborators **ChatGPT, Claude and Muse**. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for attribution and the distinction from GitHub's commit-based Contributors graph.
