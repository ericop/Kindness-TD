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
- `HappyHorn` (hero): a unicorn who orbits nearby grumpies, paints a rainbow
  trail as she flies, and cheers up everyone the rainbow touches. Only one
  HappyHorn can be on the field at a time.

## Project Notes

- Plain JavaScript
- HTML canvas
- No framework
- Game logic in [kindness-td.js](kindness-td.js), setup and pathfinding in
  [kindness-core.js](kindness-core.js)
- Build tooling in [tools/](tools)

## GitHub Pages Setup

This repo now includes a GitHub Actions workflow at [deploy-pages.yml](.github/workflows/deploy-pages.yml) that deploys the site whenever `main` is pushed.

If the site is not live yet, open your repository settings on GitHub and set `Pages` to use `GitHub Actions` as the source. After that, each push to `main` will publish the game automatically.
