# Kindness TD

![Kindness TD early screenshot](https://github.com/ericop/Kindness-TD/blob/main/Kindness%20TD%20early%20screenshot.png)

Kindness TD is a small browser-based tower defense game built with plain JavaScript and HTML canvas.

Instead of defeating enemies with damage, the goal is to help grumpies feel better. Towers reduce a grumpy's sad meter, and happy grumpies head to the Happy Hangout.

## Play Online

[Try it yourself](https://ericop.github.io/Kindness-TD/)

## Run Locally

1. Open [index.html](C:\src\kindnessTD\index.html) in a browser.

No build step or dependencies are required.

## How To Play

- Click `Start Game`.
- Move the cursor to choose a grid cell.
- Click once to open the tower build menu around the preview.
- Click a tower choice to place it.
- Stop too many sad grumpies from reaching the exit.

## Tower Types

- `Hugger`: pulls in one grumpy and reduces sadness quickly.
- `TherapyDog`: helps up to four grumpies at once and gently pulls them closer.
- `AffirmingWords`: sends speech-bubble shots at grumpies.
- `GladRadio`: passively helps grumpies in an area.

## Project Notes

- Plain JavaScript
- HTML canvas
- No framework
- Single-file game logic in [kindness-td.js](C:\src\kindnessTD\kindness-td.js)

## GitHub Pages Setup

This repo now includes a GitHub Actions workflow at [deploy-pages.yml](C:\src\kindnessTD\.github\workflows\deploy-pages.yml) that deploys the site whenever `main` is pushed.

If the site is not live yet, open your repository settings on GitHub and set `Pages` to use `GitHub Actions` as the source. After that, each push to `main` will publish the game automatically.
