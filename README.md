# Playtests

GitHub Pages site for playtest builds of Game Boy games made in GB Studio:
https://rafalaidlaw.github.io/my-platformer-playtest/

The front page is a game picker that installs as an iPhone Home Screen app. Each game
opens in its own browser player with the Playtile controller wired up, and has a ROM
download.

## Layout

- `index.html`, `playtile/`, `manifest.webmanifest`, `version.json`: the picker and
  the shared Playtile code
- `games.json`: the list of games
- `games/<slug>/`: one GB Studio web export per game, ROM in its `rom/` folder
- `play/`, `kotachomp/`, `kotachomp.html`: old addresses, now redirects

## Posting a game

Don't hand-edit this repo. Post with `tools/publish-playtest.mjs` from the My Platformer
project:

    node tools/publish-playtest.mjs --project <path to a .gbsproj> "what to test"
    node tools/publish-playtest.mjs --web <GB Studio Export Web folder> "what to test"
    node tools/publish-playtest.mjs --remove <slug>

With no `--project` / `--web` it posts My Platformer itself. It only writes the files
listed above plus the game's own `games/<slug>/` folder, so anything else here is left
alone.
