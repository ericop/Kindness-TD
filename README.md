# Kindness TD

![Kindness TD early screenshot](https://github.com/ericop/Kindness-TD/blob/main/Kindness%20TD%20early%20screenshot.png)

Kindness TD is a small browser-based tower defense game built with plain JavaScript and HTML canvas.

Instead of defeating enemies with damage, the goal is to help grumpies feel better. Your kindness crew reduces a grumpy's sad meter, and happy grumpies head to the Happy Hangout.


> Game pitch: Kindness TD is a tower defense game about spreading love through a grumpy little town. You build a kindness crew, cheer up grumpies instead of defeating them, and guide them toward the Happy Hangout.

## Play Online

[Try it yourself](https://ericop.github.io/Kindness-TD/)

## Run Locally

Open [index.html](index.html) in a browser. The game itself needs no build step
and no dependencies.

## Build The js13kGames Package

Kindness TD is an entry for [js13kGames 2026](https://js13kgames.com/2026/rules),
whose theme is *Unicorns and Rainbows*. The competition caps the whole game at a
13,312 byte zip, so there is a build step for the submission package:

```bash
npm ci
npm run build
```

That writes `dist/index.html` (everything inlined and minified) and
`dist/kindness-td.zip`, then prints the archive size against the budget and
fails if it is over. See [JS13K-2026.md](JS13K-2026.md) for the full rules
checklist.

### The two versions

One source, two artifacts. They are the same game, packaged differently:

| | Where it lives | What it is |
| --- | --- | --- |
| **Big** | GitHub Pages, served from the repo root | `index.html` plus the readable `kindness-core.js` and `kindness-td.js`. No size limit |
| **Little** | `dist/kindness-td.zip` | One inlined, minified, mangled `index.html`. This is the file the competition wants, and it must stay at or under 13,312 bytes |

The competition asks for a **`.zip`**, not a `.gz`, with `index.html` at the
archive's top level. `npm run build` produces exactly that and fails if the
archive is over budget or the layout is wrong, so a passing build is a
submittable build.

Because only the little version is capped, the hosted big version is free to
grow. Nothing is set up to make them differ today; if you ever want that, keep
one source and strip the extras at build time rather than forking the files.

## How To Play

- Click `Start Game`.
- Move the cursor to choose a grid cell.
- Click once to open the build menu beside the preview.
- Click a buddy to place them.
- Stop too many sad grumpies from reaching the exit.

## Your Kindness Crew

The game calls the units you place **buddies**, and the group of them your
**kindness crew**. It is still a tower defense game &ndash; they are just not towers.

- `Hugger`: pulls in one grumpy and reduces sadness quickly.
- `TherapyDog`: helps up to four grumpies at once and gently pulls them closer.
- `AffirmingWords`: sends speech-bubble shots at grumpies.
- `GladRadio`: passively helps grumpies in an area.
- `Happy Horn` (hero): a unicorn who orbits nearby grumpies, paints a rainbow
  trail as she flies, and cheers up everyone the rainbow touches. Only one
  Happy Horn can be on the field at a time.

## Project Notes

- Plain JavaScript
- HTML canvas
- No framework
- Game logic in [kindness-td.js](kindness-td.js), setup and pathfinding in
  [kindness-core.js](kindness-core.js)
- Build tooling in [tools/](tools)

Every sprite in the game is pixel art on a small grid, grumpies included. To see
them all at once, run `npm run serve` and open
[localhost:8013/tools/sprite-preview.html](http://localhost:8013/tools/sprite-preview.html).
It loads the real game files and calls the real draw functions, so it cannot
drift from what ships, and it is not part of the build.

## GitHub Pages Setup

This repo now includes a GitHub Actions workflow at [deploy-pages.yml](.github/workflows/deploy-pages.yml) that deploys the site whenever `main` is pushed.

If the site is not live yet, open your repository settings on GitHub and set `Pages` to use `GitHub Actions` as the source. After that, each push to `main` will publish the game automatically.
