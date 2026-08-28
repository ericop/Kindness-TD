// Shared setup/state/pathfinding lives in [kindness-core.js].

const START = { x: 0, y: Math.floor(grid.rows / 2) };
const END = { x: grid.cols - 1, y: Math.floor(grid.rows / 2) };
const HAPPY_HANGOUT = {
  x: canvas.width - 226,
  y: 10,
  width: 120,
  height: 70
};
const BASE_ROUND_SPAWN = 25;
const BOSS_MINION_COUNT = 50;
const ROUND_SPAWN_INCREASE = 10;
const HEADPHONE_GRUMPY_INTERVAL = 6;
const DOG_ALLERGY_GRUMPY_INTERVAL = 6;
const DOG_ALLERGY_GRUMPY_OFFSET = 2;
const NO_HUG_GRUMPY_INTERVAL = 6;
const NO_HUG_GRUMPY_OFFSET = 4;
// 7 % 6 === 1, which is the one residue the three mod-6 traits above leave
// free, so a Stress Eater never doubles up with headphones, a mask or thorns.
const STRESS_EATER_INTERVAL = 12;
const STRESS_EATER_OFFSET = 7;
// Rounds 1-3 keep their original gentle curve; the steep part starts after,
// which is where the game had been going slack. Per-grumpy toughness used to
// grow by only +1 a round - 100 to 109 across all ten rounds, +9% - while the
// player banked ~4,660 Kindness by round 8 and buddies persist between rounds,
// so the crew compounded and the grumpies did not. At 20, difficulty growth
// from round 3 to round 9 is 4.2x where it used to be 2.0x.
const EASY_ROUNDS = 3;
const ROUND_SAD_INCREASE = 20;

function getRoundSadBonus(roundNumber) {
  return Math.max(0, roundNumber - 1)
       + Math.max(0, roundNumber - EASY_ROUNDS) * ROUND_SAD_INCREASE;
}

const BASE_SPAWN_DELAY = 0.6;
const ROUND_SPAWN_SPEEDUP = 0.9;
const instructionButton = {
  x: canvas.width / 2 - 90,
  y: canvas.height - 68,
  w: 180,
  h: 40
};
const pauseButton = {
  x: canvas.width - 96,
  y: 10,
  w: 82,
  h: 30
};
const pauseContinueButton = {
  x: canvas.width / 2 - 110,
  y: 180,
  w: 220,
  h: 42
};
const pauseMenuButton = {
  x: canvas.width / 2 - 110,
  y: 230,
  w: 220,
  h: 42
};
const pauseMusicButton = {
  x: canvas.width / 2 - 110,
  y: 280,
  w: 220,
  h: 42
};

function getRoundSpawnCount(roundNumber) {
  return BASE_ROUND_SPAWN + (roundNumber - 1) * ROUND_SPAWN_INCREASE;
}

// Boss rounds replace the normal spawn count with one boss plus a fixed minion
// train, so the round intro has to match what startRound will actually build.
function getRoundGrumpyCount(roundNumber) {
  const isBossRound = roundNumber === 5 || roundNumber === 10;
  return isBossRound ? BOSS_MINION_COUNT + 1 : getRoundSpawnCount(roundNumber);
}

function getSpawnDelayForRound(roundNumber) {
  return BASE_SPAWN_DELAY * Math.pow(ROUND_SPAWN_SPEEDUP, roundNumber - 1);
}

// The last page of every round's deck. It replaces a banner that faded over
// the top of gameplay after 2.5s, which could not be read in time and, because
// it never set a fill colour, drew in whatever shade the previous draw call
// left behind.
function getRoundIntroPage(roundNumber) {
  const hpBonus = getRoundSadBonus(roundNumber);
  const count = getRoundGrumpyCount(roundNumber);

  let body = `${count} grumpies are heading in. This round beefs them up by +${hpBonus} sad meter.`;
  if (roundNumber < state.totalRounds) {
    const nextJump = getRoundSadBonus(roundNumber + 1) - hpBonus;
    body += ` Next round adds +${ROUND_SPAWN_INCREASE} grumpies and +${nextJump} sad meter.`;
  }

  return { title: `Round ${roundNumber} Incoming`, body };
}

function getInstructionPages(roundNumber) {
  if (roundNumber === 1) {
    // Advanced Mode stays a surprise until it is earned, so the intro only
    // mentions it to someone already playing it, where it explains why
    // everything suddenly takes twice the kindness (hpMultiplier, createGrumpy).
    const intro = "This game is all about kindness and spreading love to people who have grumpy hearts, so they can go hang out in the Happy Hangout. Build your kindness crew to do this.";

    return [
      {
        title: "Round 1",
        body: state.advancedMode
          ? intro + " You are playing Advanced Mode: every grumpy and boss starts with twice the sadness, so each one needs twice as much kindness!"
          : intro
      },
      ...(state.advancedMode ? [{
        title: "The Stress Eater",
        body: "Advanced Mode brings the Stress Eater. Cookies are scattered around town and he heads straight for the nearest one instead of the exit, stopping to nibble. He has twice the sadness of a normal grumpy, so use the time he wastes snacking.",
        icon: { isStressEater: true }
      }] : []),
      state.advancedMode
        ? {
            title: "HappyHorn Is Proud of You",
            body: "You finished all ten rounds, so HappyHorn is not making you save up this time. She is already waiting in the middle of town, for free, painting rainbows from the very first grumpy.",
            buddyIcon: "unicorn"
          }
        : {
            title: "Meet HappyHorn",
            body: "HappyHorn the Unicorn is your hero. She flies circles around the nearest grumpy, painting a rainbow that cheers up every grumpy it touches. Only one at a time, so save up for her.",
            buddyIcon: "unicorn"
          }
    ];
  }

  if (roundNumber === 2) {
    return [
      {
        title: "Round 2",
        body: "Headphone grumpies do not listen to Affirming Words and they tune out Glad Radio. Use hugs or other support to help them.",
        icon: { hasHeadphones: true, hasDogAllergy: false }
      }
    ];
  }

  if (roundNumber === 3) {
    return [
      {
        title: "Round 3",
        body: "Some grumpies are allergic to therapy dogs. Their mask icon means Therapy Dogs will skip them, so use your other buddies instead.",
        icon: { hasHeadphones: false, hasDogAllergy: true }
      }
    ];
  }

  if (roundNumber === 4) {
    return [
      {
        title: "Round 4",
        body: "Some grumpies do not like hugs. Their prickly thorns mean Huggers will leave them alone, so use words, radio, or dogs to help them instead.",
        icon: { hasHeadphones: false, hasDogAllergy: false, avoidsHugs: true }
      }
    ];
  }

  if (roundNumber === 5) {
    return [
      {
        title: "Round 5 Boss Fight",
        body: "A huge headphone grumpy is stomping in. Headphone Hank tunes out Affirming Words and Glad Radio, has a massive grumpy heart, but he is still partial to pets, so Therapy Dogs can help.",
        icon: { isBoss: true, hasHeadphones: true, bossName: "Headphone Hank", bossHp: 1500 }
      }
    ];
  }

  if (roundNumber === 10) {
    return [
      {
        title: "Round 10 Boss Fight",
        body: "Negative Neil is the gloomiest grump in town. Anything he brushes past goes grumpy in half a second, so keep your kindness crew off his route. HappyHorn is the one he cannot sour - let her circle him.",
        icon: { isBoss: true, bossName: "Negative Neil", bossHp: 1500 }
      }
    ];
  }

  return [];
}

function beginRoundFlow(roundNumber) {
  // Always at least one page, so every round opens with a popup the player
  // dismisses rather than a banner that vanishes on its own.
  const pages = [...getInstructionPages(roundNumber), getRoundIntroPage(roundNumber)];

  state.pendingRound = roundNumber;
  state.instructionPages = pages;
  state.instructionPageIndex = 0;
  state.gameMode = "instructions";
  placementMenu.active = false;
}

function moveToHappyHangout(grumpy, dt) {
  const tx = HAPPY_HANGOUT.x + HAPPY_HANGOUT.width / 2;
  const ty = HAPPY_HANGOUT.y + HAPPY_HANGOUT.height / 2;
  const dx = tx - grumpy.x;
  const dy = ty - grumpy.y;
  const d = Math.hypot(dx, dy);

  if (d > 2) {
    grumpy.x += (dx / d) * grumpy.speed * 2 * dt;
    grumpy.y += (dy / d) * grumpy.speed * 2 * dt;
  }
}

function refreshGrumpyPaths() {
  state.grumpies.forEach(grumpy => {
    if (grumpy.isHappy || grumpy.reachedEnd) return;

    // A Stress Eater is heading for a cookie, not the exit, so he gets
    // repathed to his own goal instead.
    if (grumpy.isStressEater) {
      retargetStressEater(grumpy);
      return;
    }

    const startCell = getCell(grumpy.x, grumpy.y);
    const path = findPath(
      { x: startCell.cx, y: startCell.cy },
      END
    );

    if (path) {
      grumpy.path = path;
      grumpy.pathIndex = 0;
    }
  });
}

function resetBuddyTargets() {
  hugBuddies.forEach(buddy => {
    buddy.target = null;
  });

  therapyDogs.forEach(buddy => {
    buddy.targets = [];
  });

  affirmBuddies.forEach(buddy => {
    buddy.target = null;
  });

  unicorns.forEach(buddy => {
    buddy.target = null;
  });
}

function forEachBuddy(callback) {
  hugBuddies.forEach(buddy => callback(buddy, "hug"));
  therapyDogs.forEach(buddy => callback(buddy, "dog"));
  affirmBuddies.forEach(buddy => callback(buddy, "affirm"));
  radioBuddies.forEach(buddy => callback(buddy, "radio"));
  unicorns.forEach(buddy => callback(buddy, "unicorn"));
}

function createStandardRoundGrumpy(roundNumber, index, spawnDelay) {
  const g = createGrumpy(index * spawnDelay, {
    hasHeadphones:
      roundNumber >= 2 &&
      index % HEADPHONE_GRUMPY_INTERVAL === HEADPHONE_GRUMPY_INTERVAL - 1,
    hasDogAllergy:
      roundNumber >= 3 &&
      index % DOG_ALLERGY_GRUMPY_INTERVAL === DOG_ALLERGY_GRUMPY_OFFSET,
    avoidsHugs:
      roundNumber >= 4 &&
      index % NO_HUG_GRUMPY_INTERVAL === NO_HUG_GRUMPY_OFFSET,
    isStressEater:
      state.advancedMode &&
      index % STRESS_EATER_INTERVAL === STRESS_EATER_OFFSET
  });
  if (g.isStressEater) retargetStressEater(g);
  else g.path = findPath(START, END) || [];
  return g;
}

function startRound(roundNumber) {
  state.currentRound = roundNumber;
  state.grumpies = [];
  state.happyCount = 0;
  state.totalSpawned = getRoundSpawnCount(roundNumber);
  placementMenu.active = false;
  textBubbles.length = 0;
  rainbowTrail.length = 0;
  spawnCookies();
  resetBuddyTargets();

  if (roundNumber === 5) {
    const minionCount = BOSS_MINION_COUNT;
    state.totalSpawned = minionCount + 1;
    const spawnDelay = getSpawnDelayForRound(roundNumber);
    const boss = createGrumpy(0, {
      isBoss: true,
      hasHeadphones: true,
      bossName: "Headphone Hank",
      bossHp: 1500
    });
    boss.path = findPath(START, END) || [];
    state.grumpies.push(boss);

    for (let i = 0; i < minionCount; i++) {
      state.grumpies.push(createStandardRoundGrumpy(roundNumber, i + 1, spawnDelay));
    }
    return;
  }

  if (roundNumber === 10) {
    const minionCount = BOSS_MINION_COUNT;
    state.totalSpawned = minionCount + 1;
    const spawnDelay = getSpawnDelayForRound(roundNumber);
    const boss = createGrumpy(0, {
      isBoss: true,
      bossName: "Negative Neil",
      bossHp: 1500
    });
    boss.path = findPath(START, END) || [];
    state.grumpies.push(boss);

    for (let i = 0; i < minionCount; i++) {
      state.grumpies.push(createStandardRoundGrumpy(roundNumber, i + 1, spawnDelay));
    }
    return;
  }

  const spawnDelay = getSpawnDelayForRound(roundNumber);

  for (let i = 0; i < state.totalSpawned; i++) {
    state.grumpies.push(createStandardRoundGrumpy(roundNumber, i, spawnDelay));
  }
}

// =========================
// MENU
// =========================
const startButton = {
  x: canvas.width/2 - 100,
  y: canvas.height/2 + 65,
  w: 200,
  h: 50
};
const advancedModeButton = {
  x: startButton.x + startButton.w + 20,
  y: startButton.y,
  w: 200,
  h: 50
};
const creditsButton = {
  x: canvas.width / 2 - 85,
  y: canvas.height / 2 + 124,
  w: 170,
  h: 40
};
const creditsCloseButton = {
  x: canvas.width / 2 - 90,
  y: canvas.height - 74,
  w: 180,
  h: 40
};

const buddyCosts = {
  hug: 30,
  dog: 80,
  affirm: 20,
  radio: 50,
  unicorn: 120
};

const buildMenuButtons = [
  { label: "Hugger", buddyType: "hug" },
  { label: "TherapyDog", buddyType: "dog" },
  { label: "AffirmingWords", buddyType: "affirm" },
  { label: "GladRadio", buddyType: "radio" },
  { label: "HappyHorn", buddyType: "unicorn" }
];

const BUILD_MENU_COLS = 2;
const BUILD_MENU_GAP = 4;
const BUILD_MENU_TOP = 44;   // clears the Pause button
const BUDDY_PIXEL_DIM = 10;

// =========================
// PIXEL ART DEFINITIONS
// Each object in the array represents a "pixel block".
// x/y = position in mini grid, c = color
// Comments explain what part of the buddy it is
// =========================

const buddyPixelArt = {
  hug: [
    { x: 3, y: 0, c: "#ff7faa" }, { x: 6, y: 0, c: "#ff7faa" },
    { x: 2, y: 1, c: "#ff7faa" }, { x: 3, y: 1, c: "#ffb3c8" }, { x: 4, y: 1, c: "#ff7faa" }, { x: 5, y: 1, c: "#ff7faa" }, { x: 6, y: 1, c: "#ffb3c8" }, { x: 7, y: 1, c: "#ff7faa" },
    { x: 1, y: 2, c: "#ffd7a3" }, { x: 2, y: 2, c: "#ff7faa" }, { x: 3, y: 2, c: "#ff7faa" }, { x: 4, y: 2, c: "#ff7faa" }, { x: 5, y: 2, c: "#ff7faa" }, { x: 6, y: 2, c: "#ff7faa" }, { x: 7, y: 2, c: "#ff7faa" }, { x: 8, y: 2, c: "#ffd7a3" },
    { x: 1, y: 3, c: "#ff7faa" }, { x: 2, y: 3, c: "#ff9bbd" }, { x: 3, y: 3, c: "#2f1b2d" }, { x: 4, y: 3, c: "#ffb3c8" }, { x: 5, y: 3, c: "#ffb3c8" }, { x: 6, y: 3, c: "#2f1b2d" }, { x: 7, y: 3, c: "#ff9bbd" }, { x: 8, y: 3, c: "#ff7faa" },
    { x: 2, y: 4, c: "#ff7faa" }, { x: 3, y: 4, c: "#ff7faa" }, { x: 4, y: 4, c: "#ffe5f0" }, { x: 5, y: 4, c: "#ffe5f0" }, { x: 6, y: 4, c: "#ff7faa" }, { x: 7, y: 4, c: "#ff7faa" },
    { x: 1, y: 5, c: "#ff7faa" }, { x: 2, y: 5, c: "#ff7faa" }, { x: 3, y: 5, c: "#ff7faa" }, { x: 4, y: 5, c: "#ffb3c8" }, { x: 5, y: 5, c: "#ffb3c8" }, { x: 6, y: 5, c: "#ff7faa" }, { x: 7, y: 5, c: "#ff7faa" }, { x: 8, y: 5, c: "#ff7faa" },
    { x: 2, y: 6, c: "#ff7faa" }, { x: 3, y: 6, c: "#ff7faa" }, { x: 4, y: 6, c: "#ff7faa" }, { x: 5, y: 6, c: "#ff7faa" }, { x: 6, y: 6, c: "#ff7faa" }, { x: 7, y: 6, c: "#ff7faa" },
    { x: 3, y: 7, c: "#ff7faa" }, { x: 4, y: 7, c: "#ff9bbd" }, { x: 5, y: 7, c: "#ff9bbd" }, { x: 6, y: 7, c: "#ff7faa" },
    { x: 3, y: 8, c: "#ff7faa" }, { x: 4, y: 8, c: "#ff7faa" }, { x: 5, y: 8, c: "#ff7faa" }, { x: 6, y: 8, c: "#ff7faa" },
    { x: 4, y: 9, c: "#ff7faa" }, { x: 5, y: 9, c: "#ff7faa" }
  ],

  dog: [
    { x: 2, y: 0, c: "#8f5a2a" }, { x: 7, y: 0, c: "#8f5a2a" },
    { x: 1, y: 1, c: "#8f5a2a" }, { x: 2, y: 1, c: "#8f5a2a" }, { x: 3, y: 1, c: "#f4c78a" }, { x: 4, y: 1, c: "#f4c78a" }, { x: 5, y: 1, c: "#f4c78a" }, { x: 6, y: 1, c: "#f4c78a" }, { x: 7, y: 1, c: "#8f5a2a" }, { x: 8, y: 1, c: "#8f5a2a" },
    { x: 1, y: 2, c: "#8f5a2a" }, { x: 2, y: 2, c: "#f4c78a" }, { x: 3, y: 2, c: "#f8ddb4" }, { x: 4, y: 2, c: "#f8ddb4" }, { x: 5, y: 2, c: "#f8ddb4" }, { x: 6, y: 2, c: "#f8ddb4" }, { x: 7, y: 2, c: "#f4c78a" }, { x: 8, y: 2, c: "#8f5a2a" },
    { x: 1, y: 3, c: "#f4c78a" }, { x: 2, y: 3, c: "#f4c78a" }, { x: 3, y: 3, c: "#111111" }, { x: 4, y: 3, c: "#f8ddb4" }, { x: 5, y: 3, c: "#f8ddb4" }, { x: 6, y: 3, c: "#111111" }, { x: 7, y: 3, c: "#f4c78a" }, { x: 8, y: 3, c: "#f4c78a" },
    { x: 2, y: 4, c: "#d99b58" }, { x: 3, y: 4, c: "#f6e4d4" }, { x: 4, y: 4, c: "#444444" }, { x: 5, y: 4, c: "#f6e4d4" }, { x: 6, y: 4, c: "#f6e4d4" }, { x: 7, y: 4, c: "#d99b58" },
    { x: 2, y: 5, c: "#d99b58" }, { x: 3, y: 5, c: "#d99b58" }, { x: 4, y: 5, c: "#c83c4a" }, { x: 5, y: 5, c: "#c83c4a" }, { x: 6, y: 5, c: "#d99b58" }, { x: 7, y: 5, c: "#d99b58" },
    // Lime collar with a gold tag, sitting on the neck. Red sat directly above
    // the red tongue and the two blurred together. Lime is chosen dark enough
    // (hue 89) that the single gold pixel still reads: 2.70 contrast against
    // #ffe98a, where a brighter lime drops it to ~1.2 and the tag disappears.
    { x: 3, y: 6, c: "#5f9e1a" }, { x: 4, y: 6, c: "#ffe98a" }, { x: 5, y: 6, c: "#5f9e1a" }, { x: 6, y: 6, c: "#5f9e1a" },
    { x: 2, y: 7, c: "#8f5a2a" }, { x: 3, y: 7, c: "#d99b58" }, { x: 4, y: 7, c: "#d99b58" }, { x: 5, y: 7, c: "#d99b58" }, { x: 6, y: 7, c: "#d99b58" }, { x: 7, y: 7, c: "#8f5a2a" },
    { x: 3, y: 8, c: "#8f5a2a" }, { x: 4, y: 8, c: "#d99b58" }, { x: 5, y: 8, c: "#d99b58" }, { x: 6, y: 8, c: "#8f5a2a" }, 
    { x: 3, y: 9, c: "#8f5a2a" }, { x: 4, y: 9, c: "#8f5a2a" }, { x: 5, y: 9, c: "#8f5a2a" }, { x: 6, y: 9, c: "#8f5a2a" }
  ],

  affirm: [
    { x: 1, y: 3, c: "#d9d9d9" }, { x: 2, y: 3, c: "#f3f3f3" }, { x: 3, y: 3, c: "#ffffff" }, { x: 4, y: 3, c: "#ffffff" }, { x: 5, y: 3, c: "#ffffff" },
    { x: 1, y: 4, c: "#cfcfcf" }, { x: 2, y: 4, c: "#f7f7f7" }, { x: 3, y: 4, c: "#ffffff" }, { x: 4, y: 4, c: "#ffffff" }, { x: 5, y: 4, c: "#ffffff" }, { x: 6, y: 4, c: "#ffffff" }, { x: 7, y: 4, c: "#ffffff" },
    { x: 1, y: 5, c: "#bdbdbd" }, { x: 2, y: 5, c: "#ececec" }, { x: 3, y: 5, c: "#ffffff" }, { x: 4, y: 5, c: "#ffffff" }, { x: 5, y: 5, c: "#ffffff" }, { x: 6, y: 5, c: "#ffffff" }, { x: 7, y: 5, c: "#ffffff" }, { x: 8, y: 5, c: "#ffffff" }, { x: 9, y: 5, c: "#d4d4d4" },
    { x: 1, y: 6, c: "#cfcfcf" }, { x: 2, y: 6, c: "#f7f7f7" }, { x: 3, y: 6, c: "#ffffff" }, { x: 4, y: 6, c: "#ffffff" }, { x: 5, y: 6, c: "#ffffff" }, { x: 6, y: 6, c: "#ffffff" }, { x: 7, y: 6, c: "#ffffff" }, { x: 8, y: 6, c: "#f0f0f0" }, { x: 9, y: 6, c: "#bdbdbd" },
    { x: 1, y: 7, c: "#d9d9d9" }, { x: 2, y: 7, c: "#f3f3f3" }, { x: 3, y: 7, c: "#ffffff" }, { x: 4, y: 7, c: "#ffffff" }, { x: 5, y: 7, c: "#ffffff" }, { x: 6, y: 7, c: "#ffffff" }, { x: 7, y: 7, c: "#efefef" }, { x: 8, y: 7, c: "#c6c6c6" },
    { x: 3, y: 8, c: "#9b9b9b" }, { x: 4, y: 8, c: "#ffffff" }, { x: 5, y: 8, c: "#ffffff" }, { x: 6, y: 8, c: "#8f8f8f" },
    { x: 4, y: 9, c: "#7d7d7d" }, { x: 5, y: 9, c: "#7d7d7d" }
  ],

radio: [
  // antenna
  { x: 7, y: 0, c: "#aaaaaa" },
  { x: 7, y: 1, c: "#cccccc" },

  // handle (with transparent gap below)
  { x: 3, y: 1, c: "#222222" }, { x: 4, y: 1, c: "#222222" }, { x: 5, y: 1, c: "#222222" }, { x: 6, y: 1, c: "#222222" },

  // body top (note: row 2 leaves space under handle at x:4,5)
  { x: 2, y: 2, c: "#444444" }, { x: 3, y: 2, c: "#666666" },
  { x: 6, y: 2, c: "#666666" }, { x: 7, y: 2, c: "#444444" },

  // tuner row
  { x: 1, y: 3, c: "#444444" }, { x: 2, y: 3, c: "#999999" }, { x: 3, y: 3, c: "#ffce2e" }, { x: 4, y: 3, c: "#ffce2e" },
  { x: 5, y: 3, c: "#ffce2e" }, { x: 6, y: 3, c: "#ffce2e" }, { x: 7, y: 3, c: "#999999" }, { x: 8, y: 3, c: "#444444" },

  // tuner + knobs
  { x: 1, y: 4, c: "#444444" }, { x: 2, y: 4, c: "#bbbbbb" }, { x: 3, y: 4, c: "#fff12a" }, { x: 4, y: 4, c: "#fff12a" },
  { x: 5, y: 4, c: "#fff12a" }, { x: 6, y: 4, c: "#fff12a" }, { x: 7, y: 4, c: "#bbbbbb" }, { x: 8, y: 4, c: "#444444" },

  // speaker row 1
  { x: 1, y: 5, c: "#444444" }, { x: 2, y: 5, c: "#222222" }, { x: 3, y: 5, c: "#111111" }, { x: 4, y: 5, c: "#222222" },
  { x: 5, y: 5, c: "#222222" }, { x: 6, y: 5, c: "#111111" }, { x: 7, y: 5, c: "#222222" }, { x: 8, y: 5, c: "#444444" },

  // speaker row 2
  { x: 1, y: 6, c: "#444444" }, { x: 2, y: 6, c: "#bbbbbb" }, { x: 3, y: 6, c: "#222222" }, { x: 4, y: 6, c: "#111111" },
  { x: 5, y: 6, c: "#bbbbbb" }, { x: 6, y: 6, c: "#bbbbbb" }, { x: 7, y: 6, c: "#222222" }, { x: 8, y: 6, c: "#444444" },

  // bottom body
  { x: 2, y: 7, c: "#666666" }, { x: 3, y: 7, c: "#777777" }, { x: 4, y: 7, c: "#777777" },
  { x: 5, y: 7, c: "#777777" }, { x: 6, y: 7, c: "#777777" }, { x: 7, y: 7, c: "#666666" },

  // feet
  { x: 2, y: 8, c: "#222222" }, { x: 7, y: 8, c: "#222222" }
],

  // HappyHorn the Unicorn, side view facing right: golden horn, rainbow mane
  // running down the neck, rainbow tail trailing off the back.
  unicorn: [
    // horn
    { x: 7, y: 0, c: "#ffe98a" },
    { x: 7, y: 1, c: "#ffc21f" },

    // rainbow mane, sweeping from the horn down the neck
    { x: 5, y: 1, c: "#ff5d73" }, { x: 6, y: 1, c: "#ff9f45" },
    { x: 4, y: 2, c: "#ff5d73" }, { x: 5, y: 2, c: "#ffd93d" },
    { x: 3, y: 3, c: "#ff9f45" }, { x: 4, y: 3, c: "#7ee081" },
    { x: 2, y: 4, c: "#4dc3ff" }, { x: 3, y: 4, c: "#b98cff" },

    // head, eye and snout
    { x: 6, y: 2, c: "#fff6fb" }, { x: 7, y: 2, c: "#ffffff" }, { x: 8, y: 2, c: "#fff6fb" },
    { x: 5, y: 3, c: "#ffffff" }, { x: 6, y: 3, c: "#ffffff" }, { x: 7, y: 3, c: "#3b2340" }, { x: 8, y: 3, c: "#ffc9de" },

    // neck into body
    { x: 4, y: 4, c: "#ffffff" }, { x: 5, y: 4, c: "#ffffff" }, { x: 6, y: 4, c: "#ffffff" }, { x: 7, y: 4, c: "#fff6fb" }, { x: 8, y: 4, c: "#ffc9de" },

    // body
    { x: 1, y: 5, c: "#fff6fb" }, { x: 2, y: 5, c: "#ffffff" }, { x: 3, y: 5, c: "#ffffff" }, { x: 4, y: 5, c: "#ffffff" }, { x: 5, y: 5, c: "#ffffff" }, { x: 6, y: 5, c: "#ffffff" }, { x: 7, y: 5, c: "#fff6fb" },
    { x: 1, y: 6, c: "#fff6fb" }, { x: 2, y: 6, c: "#ffffff" }, { x: 3, y: 6, c: "#ffffff" }, { x: 4, y: 6, c: "#ffffff" }, { x: 5, y: 6, c: "#ffffff" }, { x: 6, y: 6, c: "#ffffff" }, { x: 7, y: 6, c: "#fff6fb" },

    // rainbow tail
    { x: 0, y: 4, c: "#ff5d73" }, { x: 0, y: 5, c: "#ffd93d" }, { x: 0, y: 6, c: "#7ee081" }, { x: 0, y: 7, c: "#4dc3ff" },

    // legs
    { x: 2, y: 7, c: "#ffffff" }, { x: 3, y: 7, c: "#fff6fb" }, { x: 5, y: 7, c: "#fff6fb" }, { x: 6, y: 7, c: "#ffffff" },
    { x: 2, y: 8, c: "#ffffff" }, { x: 3, y: 8, c: "#fff6fb" }, { x: 5, y: 8, c: "#fff6fb" }, { x: 6, y: 8, c: "#ffffff" },

    // hooves
    { x: 2, y: 9, c: "#b98cff" }, { x: 3, y: 9, c: "#b98cff" }, { x: 5, y: 9, c: "#b98cff" }, { x: 6, y: 9, c: "#b98cff" }
  ],
};

const menuGrumpies = [];

function ensureMenuGrumpies() {
  if (menuGrumpies.length) return;

  // Everyone on the title screen has already been cheered up - it is the
  // Happy Hangout, not a wave. isHappy makes drawGrumpySprite use the gold
  // body and the smile instead of the frown.
  const drifters = [
    [160, 250,  18,  7, 0, 0, 0],
    [240, 295,  14, -6, 1, 0, 0],
    [375, 260, -16,  5, 0, 1, 0],
    [520, 300,  15, -5, 1, 0, 0],
    [455, 315,  13,  4, 0, 0, 1],
    [610, 248, -17,  6, 0, 0, 0],
    [120, 305,  16, -5, 0, 0, 1],
    [300, 232, -14,  6, 0, 0, 0],
    [420, 288,  17,  5, 0, 0, 0],
    [560, 244, -15, -6, 0, 1, 0],
    [660, 300,  13,  6, 1, 0, 0],
    [200, 268, -18, -4, 0, 0, 0]
  ];

  for (const [x, y, vx, vy, phones, allergy, nohugs] of drifters) {
    menuGrumpies.push({
      x, y, vx, vy,
      isHappy: true,
      hasHeadphones: !!phones,
      hasDogAllergy: !!allergy,
      avoidsHugs: !!nohugs
    });
  }
}

function updateMenuGrumpies(dt) {
  ensureMenuGrumpies();

  const minX = 90;
  const maxX = canvas.width - 90;
  const minY = 218;
  const maxY = canvas.height - 34;

  menuGrumpies.forEach(grumpy => {
    grumpy.x += grumpy.vx * dt;
    grumpy.y += grumpy.vy * dt;

    if (grumpy.x <= minX || grumpy.x >= maxX) {
      grumpy.vx *= -1;
      grumpy.x = Math.max(minX, Math.min(maxX, grumpy.x));
    }

    if (grumpy.y <= minY || grumpy.y >= maxY) {
      grumpy.vy *= -1;
      grumpy.y = Math.max(minY, Math.min(maxY, grumpy.y));
    }
  });
}

function drawGrumpySprite(ctx, grumpy, showHealthBar = true) {
  const scale = grumpy.scale || 1;
  const radius = 10 * scale;

  ctx.fillStyle=grumpy.isHappy?'gold':'gray';
  ctx.beginPath();
  ctx.arc(grumpy.x,grumpy.y,radius,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(grumpy.x - 3 * scale, grumpy.y - 2 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.arc(grumpy.x + 3 * scale, grumpy.y - 2 * scale, 1.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  if (grumpy.isHappy) {
    ctx.arc(grumpy.x, grumpy.y + 2 * scale, 4 * scale, 0.15 * Math.PI, 0.85 * Math.PI);
  } else {
    ctx.arc(grumpy.x, grumpy.y + 7 * scale, 4 * scale, 1.15 * Math.PI, 1.85 * Math.PI);
  }
  ctx.stroke();

  if (showHealthBar) {
    ctx.fillStyle='red';
    ctx.fillRect(grumpy.x-10 * scale,grumpy.y-18 * scale,20 * scale,3 * scale);

    ctx.fillStyle='lime';
    ctx.fillRect(grumpy.x-10 * scale,grumpy.y-18 * scale,20 * scale*(1-grumpy.sad/grumpy.maxSad),3 * scale);
  }

  // Every offset here is scaled. Unscaled, the band sat at radius 11 against
  // Headphone Hank's radius-15 head - 4px inside his skull, with the earcups
  // not even reaching his edge, which is why they looked clamped on.
  if (grumpy.hasHeadphones) {
    ctx.strokeStyle = 'rgba(190, 120, 255, 0.65)';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(grumpy.x, grumpy.y - 4 * scale, 11 * scale, Math.PI, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#5c2d91';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(grumpy.x, grumpy.y - 4 * scale, 8 * scale, Math.PI, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#8750c7';
    ctx.fillRect(grumpy.x - 14 * scale, grumpy.y - 2 * scale, 6 * scale, 8 * scale);
    ctx.fillRect(grumpy.x + 8 * scale, grumpy.y - 2 * scale, 6 * scale, 8 * scale);

    ctx.fillStyle = '#b28ae6';
    ctx.fillRect(grumpy.x - 13 * scale, grumpy.y, 2 * scale, 4 * scale);
    ctx.fillRect(grumpy.x + 11 * scale, grumpy.y, 2 * scale, 4 * scale);
  }

  if (grumpy.hasDogAllergy) {
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(grumpy.x - 6 * scale, grumpy.y + 1 * scale, 12 * scale, 5 * scale);

    ctx.fillStyle = '#d9dee5';
    ctx.fillRect(grumpy.x - 4 * scale, grumpy.y + 2 * scale, 8 * scale, 1 * scale);

    ctx.strokeStyle = '#b8c2cc';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(grumpy.x - 6 * scale, grumpy.y + 2 * scale);
    ctx.lineTo(grumpy.x - 10 * scale, grumpy.y + 1 * scale);
    ctx.moveTo(grumpy.x + 6 * scale, grumpy.y + 2 * scale);
    ctx.lineTo(grumpy.x + 10 * scale, grumpy.y + 1 * scale);
    ctx.stroke();
  }

  // Thorns drop away once they cheer up: nothing is left to warn the player
  // about, and softening as they head for the Happy Hangout is the whole point
  // of the game.
  if (grumpy.avoidsHugs && !grumpy.isHappy) {
    // Prickly. The thorns change the silhouette rather than adding detail
    // inside it, so a no-hug grumpy can be picked out of a moving queue
    // without looking straight at them. Thorn tips stop at 13.5, which keeps
    // them clear of the sad meter at y-15.
    ctx.fillStyle = '#5f7180';
    const thornCount = 10;
    const thornHalfWidth = 0.17;

    for (let i = 0; i < thornCount; i++) {
      const angle = (i / thornCount) * Math.PI * 2 - Math.PI / 2;
      const a0 = angle - thornHalfWidth;
      const a1 = angle + thornHalfWidth;

      ctx.beginPath();
      ctx.moveTo(grumpy.x + Math.cos(a0) * 9 * scale, grumpy.y + Math.sin(a0) * 9 * scale);
      ctx.lineTo(grumpy.x + Math.cos(angle) * 13.5 * scale, grumpy.y + Math.sin(angle) * 13.5 * scale);
      ctx.lineTo(grumpy.x + Math.cos(a1) * 9 * scale, grumpy.y + Math.sin(a1) * 9 * scale);
      ctx.closePath();
      ctx.fill();
    }
  }

  // The Stress Eater carries his snack, which is what tells him apart at a
  // glance; the extra 1.25 scale reads as the doubled sad meter.
  if (grumpy.isStressEater && !grumpy.isHappy) {
    drawCookie(ctx, grumpy.x + 10 * scale, grumpy.y + 5 * scale, 5 * scale);

    if (grumpy.eatTimer > 0) {
      ctx.fillStyle = "#d79a55";
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + grumpy.eatTimer * 4;
        ctx.beginPath();
        ctx.arc(
          grumpy.x + Math.cos(a) * 13 * scale,
          grumpy.y + 8 * scale + Math.sin(a) * 3 * scale,
          1.4 * scale,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  if(grumpy.isHugged){
    ctx.strokeStyle='pink';
    const t=performance.now()*0.005;
    for(let i=0;i<2;i++){
      const a=t+i*Math.PI;
      ctx.beginPath();
      ctx.moveTo(grumpy.x+Math.cos(a)*12*scale,grumpy.y+Math.sin(a)*12*scale);
      ctx.lineTo(grumpy.x+Math.cos(a+1)*12*scale,grumpy.y+Math.sin(a+1)*12*scale);
      ctx.stroke();
    }
  }

  if (grumpy.name) {
    ctx.fillStyle = "#fff4b5";
    ctx.font = `${Math.max(12, 12 * scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    // Named grumpies spawn hard against the left edge, where a centred label
    // gets its first few letters cut off. Keep the whole label on canvas.
    const half = ctx.measureText(grumpy.name).width / 2;
    ctx.fillText(
      grumpy.name,
      clamp(grumpy.x, half + 4, canvas.width - half - 4),
      grumpy.y - radius - 8
    );
  }
}

function startGame(advancedMode = false) {
  state.escapedSad = 0;
  state.gameOver = false;
  state.win = false;
  state.careCredits = 100;
  state.currentRound = 1;
  state.pendingRound = 1;
  state.instructionPages = [];
  state.instructionPageIndex = 0;
  state.advancedMode = advancedMode;
  state.justUnlockedAdvanced = false;

  hugBuddies.length = 0;
  therapyDogs.length = 0;
  affirmBuddies.length = 0;
  radioBuddies.length = 0;
  unicorns.length = 0;
  rainbowTrail.length = 0;
  cookies.length = 0;
  grid.blocked.clear();
  textBubbles.length = 0;

  // Advanced doubles every grumpy's sad meter, but the player still starts on
  // 100 Kindness while HappyHorn costs 120 - round 1 was close to unwinnable.
  // She joins for free, in the middle of town.
  if (advancedMode) {
    placeBuddy(Math.floor(grid.cols / 2), Math.floor(grid.rows / 2), "unicorn", true);
  }

  beginRoundFlow(1);
}

// =========================
// GRUMPY
// =========================
function createGrumpy(delay=0, options = {}){
  const hasHeadphones = !!options.hasHeadphones;
  const hasDogAllergy = !!options.hasDogAllergy;
  const avoidsHugs = !!options.avoidsHugs;
  const isBoss = !!options.isBoss;
  const isStressEater = !!options.isStressEater;
  const hpMultiplier = state.advancedMode ? 2 : 1;
  // Double a normal grumpy of the same round, on top of the Advanced doubling.
  const stressEaterMultiplier = isStressEater ? 2 : 1;
  const roundHpBonus = getRoundSadBonus(state.currentRound);
  const baseSad = isBoss ? (options.bossHp || 1000) : 100;
  const maxSad = (baseSad + roundHpBonus) * hpMultiplier * stressEaterMultiplier;
  return {
    x: START.x*GRID_SIZE+20,
    y: START.y*GRID_SIZE+20,
    speed:isBoss ? 26 : 40,
    sad:maxSad,
    maxSad,
    delay,
    active:false,
    isHappy:false,
    hasHeadphones,
    hasDogAllergy,
    avoidsHugs,
    isBoss,
    isStressEater,
    targetCookie:null,
    eatTimer:0,
    scale:isBoss ? 1.5 : isStressEater ? 1.25 : 1,
    name:isBoss ? (options.bossName || "Negative Neil") : isStressEater ? "Stress Eater" : "",
    allergicToDogs: hasDogAllergy,
    ignoresAffirmations: hasHeadphones,
    ignoresRadio: hasHeadphones,
    inHappyHangout:false,
    rewardGranted:false,
    reachedEnd:false,
    isHugged:false,
    path:[],
    pathIndex:0,

    update(dt){
      if (this.delay>0){ this.delay-=dt; return; }
      this.active=true;

      if (this.isHugged) return;

      if (this.isHappy){
        moveToHappyHangout(this, dt);
        const tx = HAPPY_HANGOUT.x + HAPPY_HANGOUT.width / 2;
        const ty = HAPPY_HANGOUT.y + HAPPY_HANGOUT.height / 2;
        this.inHappyHangout = Math.hypot(tx - this.x, ty - this.y) <= 6;
        if (this.inHappyHangout && !this.rewardGranted) {
          this.rewardGranted = true;
          state.careCredits += 10;
          textBubbles.push({
          text: "+10 ❤️",
            x: this.x + (Math.random() * 12 - 6),
            y: this.y - 20,
            target: null,
            life: 1,
            speed: 18,
            hit: false,
            style: "reward"
          });
        }
        return;
      }

      // Parked at a cookie. Standing still is the whole point: it is time the
      // player's buddies get for free.
      if (this.eatTimer > 0) {
        this.eatTimer -= dt;
        return;
      }

      const node=this.path[this.pathIndex];
      if(node){
        const tx=node.x*GRID_SIZE+20;
        const ty=node.y*GRID_SIZE+20;
        const dx=tx-this.x;
        const dy=ty-this.y;
        const d=Math.hypot(dx,dy);

        if(d<2) this.pathIndex++;
        else{
          this.x+=(dx/d)*this.speed*dt;
          this.y+=(dy/d)*this.speed*dt;
        }
      } else if (this.isStressEater && this.targetCookie && !this.targetCookie.eaten) {
        // Arrived at a cookie rather than the exit, so this is not an escape.
        this.targetCookie.eaten = true;
        this.targetCookie = null;
        this.eatTimer = COOKIE_EAT_TIME;
        textBubbles.push({
          text: "nom nom",
          x: this.x,
          y: this.y - 22,
          target: null,
          life: 1.2,
          speed: 0,
          hit: false
        });
        retargetStressEater(this);
      } else if(!this.reachedEnd){
        this.reachedEnd=true;
        this.active=false;
        if (this.sad > 0) {
          state.escapedSad += this.isBoss ? 5 : 1;
        }
      }
    },

    draw(ctx){
      drawGrumpySprite(ctx, this, true);
    }
  };
}

// =========================
// MUSIC
// Square lead over a triangle bass. Notes are scheduled ahead onto the
// WebAudio clock rather than fired from a timer, so the beat does not wobble
// when the main thread is busy. Each character is a hex semitone offset from
// A3; "." is a rest.
// =========================
const MUSIC_ROOT = 220;
const MUSIC_LOOKAHEAD = 0.25;   // seconds of notes queued in advance
const MUSIC_VOLUME = 0.4;

// Sunny Skip, while a wave is running.
const ROUND_TUNE = {
  t: 0.125,
  m: "047c7404259e9525047c7404b9754020",
  b: "0...0...5...5...0...0...7...7..."
};

// Kindness March, on the title screen.
const TITLE_TUNE = {
  t: 0.15,
  m: "c.b.9.7.9...7...5.7.9.b.c.......",
  b: "0.0.5.5.2.2.7.7.0.0.5.5.7.7.0.0."
};

let audioCtx = null;
let musicGain;
let musicTune = null;
let musicStep = 0;
let musicNext = 0;
let musicOn = true;

// Namespaced key: js13k games share one origin, so the rules require a prefix.
// Private browsing throws on access, hence the try.
try { musicOn = localStorage.getItem("ktd:music") !== "0"; } catch (e) {}

function musicVoice(semi, type, volume, length, at) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = MUSIC_ROOT * Math.pow(2, semi / 12);
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(at);
  osc.stop(at + length);
}

// Browsers refuse to start audio outside a user gesture, so this is only ever
// called from the pointer handler.
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = musicOn ? MUSIC_VOLUME : 0;
    musicGain.connect(audioCtx.destination);
    musicNext = audioCtx.currentTime;
  }
  if (audioCtx.state !== "running") audioCtx.resume();
}

function setMusicOn(on) {
  musicOn = on;
  if (musicGain) musicGain.gain.value = on ? MUSIC_VOLUME : 0;
  try { localStorage.setItem("ktd:music", on ? "1" : "0"); } catch (e) {}
}

// Title tune on the menu, round tune while a wave runs, silence everywhere
// else - so the music stops for the round popup and starts the next wave from
// the top of the loop rather than resuming mid-phrase.
function updateMusic() {
  const wanted =
    state.gameMode === "menu" ? TITLE_TUNE :
    state.gameMode === "playing" ? ROUND_TUNE : null;

  if (wanted !== musicTune) {
    musicTune = wanted;
    musicStep = 0;
    if (audioCtx) musicNext = audioCtx.currentTime + 0.08;
  }

  if (!musicTune || !audioCtx || audioCtx.state !== "running") return;

  while (musicNext < audioCtx.currentTime + MUSIC_LOOKAHEAD) {
    const lead = musicTune.m[musicStep % musicTune.m.length];
    if (lead !== ".") {
      musicVoice(parseInt(lead, 16) + 12, "square", 0.11, musicTune.t * 1.7, musicNext);
    }
    const bass = musicTune.b[musicStep % musicTune.b.length];
    if (bass !== ".") {
      musicVoice(parseInt(bass, 16) - 12, "triangle", 0.17, musicTune.t * 2.2, musicNext);
    }
    musicStep++;
    musicNext += musicTune.t;
  }
}

// =========================
// COOKIES
// The Stress Eater detours to these instead of walking for the exit, which
// buys the player time. Advanced Mode only, since that is where he spawns.
// =========================
const cookies = [];
const COOKIE_COUNT = 6;
const COOKIE_EAT_TIME = 1.6;   // seconds parked per cookie
const COOKIE_RADIUS = 9;

function spawnCookies() {
  cookies.length = 0;
  if (!state.advancedMode) return;

  const candidates = [];
  for (let cy = 0; cy < grid.rows; cy++) {
    for (let cx = 0; cx < grid.cols; cx++) {
      // Skip the spawn row so every cookie is an actual detour, and keep off
      // blocked cells and the Happy Hangout.
      if (cy === START.y) continue;
      if (grid.blocked.has(cellKey(cx, cy))) continue;
      if (doesCellOverlapRect(cx, cy, HAPPY_HANGOUT)) continue;
      if (!findPath(START, { x: cx, y: cy })) continue;
      candidates.push({ cx, cy });
    }
  }

  for (let i = 0; i < COOKIE_COUNT && candidates.length; i++) {
    const pick = candidates.splice((Math.random() * candidates.length) | 0, 1)[0];
    cookies.push({
      cx: pick.cx,
      cy: pick.cy,
      x: pick.cx * GRID_SIZE + 20,
      y: pick.cy * GRID_SIZE + 20,
      eaten: false
    });
  }
}

function cookieAtCell(cx, cy) {
  return cookies.find(c => !c.eaten && c.cx === cx && c.cy === cy);
}

// Send a Stress Eater to the nearest cookie he can actually reach, or to the
// exit once the plate is empty. Unreachable cookies are skipped rather than
// leaving him with an empty path, which the mover would read as escaping.
function retargetStressEater(grumpy) {
  const startCell = getCell(grumpy.x, grumpy.y);
  const from = { x: startCell.cx, y: startCell.cy };

  const reachable = cookies
    .filter(c => !c.eaten)
    .map(c => ({ cookie: c, path: findPath(from, { x: c.cx, y: c.cy }) }))
    .filter(entry => entry.path);

  if (reachable.length) {
    reachable.sort((a, b) => a.path.length - b.path.length);
    grumpy.targetCookie = reachable[0].cookie;
    grumpy.path = reachable[0].path;
    grumpy.pathIndex = 0;
    return;
  }

  grumpy.targetCookie = null;
  const exitPath = findPath(from, END);
  if (exitPath) {
    grumpy.path = exitPath;
    grumpy.pathIndex = 0;
  }
}

// Five chips at four sizes, on a tan disc with a darker crescent along the
// bottom for shading. Even sizes ringed evenly read as a shirt button, so the
// sizes vary and the two tiny ones sit out at opposite corners. Positions are
// checked so no pair overlaps, none shares a row or column, and every chip
// stays clear of the shading. [x, y, radius], all as fractions of the cookie.
const COOKIE_CHIPS = [
  [-0.30, -0.22, 0.26],
  [ 0.28,  0.04, 0.19],
  [-0.08,  0.30, 0.14],
  [ 0.34, -0.42, 0.10],
  [-0.46,  0.24, 0.10]
];

function drawCookie(ctx, x, y, r) {
  // Darker base. What stays visible along the bottom is the shading.
  ctx.fillStyle = "#a9682f";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Lit face, sat high so the base shows underneath.
  ctx.fillStyle = "#d79a55";
  ctx.beginPath();
  ctx.arc(x, y - r * 0.13, r * 0.86, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4a2a12";
  for (const [dx, dy, size] of COOKIE_CHIPS) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, r * size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCookies(ctx) {
  cookies.forEach(c => {
    if (c.eaten) return;
    drawCookie(ctx, c.x, c.y, COOKIE_RADIUS);
  });
}

// =========================
// BUDDIES
// =========================
const hugBuddies=[];
const therapyDogs=[];
const affirmBuddies=[];
const radioBuddies=[];
const unicorns=[];

// HappyHorn the Unicorn is a hero unit. Unlike the other buddies she never
// stands on her cell: she flies a loop around whichever grumpy she is helping
// and paints a rainbow behind her, and that rainbow keeps cheering grumpies up
// for a moment after she has passed.
const UNICORN_ORBIT_RADIUS = 34;
const UNICORN_ORBIT_SPEED = 2.6;      // radians per second
const UNICORN_SEEK_RANGE = 300;       // how far from her cell she looks for a grumpy
const UNICORN_FLY_SPEED = 170;        // px per second she closes on her orbit point
const UNICORN_SAD_RELIEF = 22;        // sad meter per second from the rainbow
const RAINBOW_TOUCH_RADIUS = 16;
const RAINBOW_LIFE = 1.1;             // seconds a rainbow segment lingers
const RAINBOW_DROP_INTERVAL = 0.03;   // seconds between segments
const RAINBOW_COLORS = ["#ff5d73","#ff9f45","#ffd93d","#7ee081","#4dc3ff","#b98cff"];

const rainbowTrail = [];

// Only one HappyHorn may be on the field at a time, which is what makes her a
// hero rather than another buddy to spam.
function canPlaceBuddy(buddyType) {
  if (state.careCredits < buddyCosts[buddyType]) return false;
  if (buddyType === "unicorn" && unicorns.length > 0) return false;
  return true;
}

function markGrumpyHappy(grumpy) {
  if (grumpy.isHappy) return false;
  grumpy.sad = 0;
  grumpy.isHappy = true;
  grumpy.isHugged = false;
  state.happyCount++;
  return true;
}

// =========================
// SYSTEMS
// =========================
function applyCareCredits(dt){
  radioBuddies.forEach(t=>{
    if (t.isGrumpy) return;
    state.grumpies.forEach(g=>{
      if(!g.active||g.isHappy) return;
      if(g.ignoresRadio) return;
      if(Math.hypot(g.x-t.x,g.y-t.y)<t.radius){
        g.sad-=20*dt;
        if(g.sad<=0){
          markGrumpyHappy(g);
        }
      }
    });
  });
}

function applyHugs(dt){
  hugBuddies.forEach(t=>{
    if (t.isGrumpy) {
      t.target = null;
      return;
    }
    if(!t.target){
      for(let g of state.grumpies){
        if(!g.active||g.isHappy) continue;
        if(g.avoidsHugs) continue;
        if(Math.hypot(g.x-t.x,g.y-t.y)<t.range){
          t.target=g; break;
        }
      }
    }
    if(t.target){
      const g=t.target;
      g.isHugged=true;
      g.x+=(t.x-g.x)*0.1;
      g.y+=(t.y-g.y)*0.1;
      g.sad-=40*dt;

      if(g.sad<=0){
        markGrumpyHappy(g);
        t.target=null;
      }
    }
  });
}

function applyTherapyDogs(dt){
  therapyDogs.forEach(d=>{
    if (d.isGrumpy) {
      d.targets = [];
      return;
    }
    d.targets=d.targets.filter(g=>!g.isHappy && !g.allergicToDogs);

    const candidates=state.grumpies.filter(g=>{
      if(!g.active||g.isHappy) return false;
      if(g.allergicToDogs) return false;
      if(d.targets.includes(g)) return false;
      return Math.hypot(g.x-d.x,g.y-d.y)<d.range;
    });

    for(let g of candidates){
      if(d.targets.length>=2) break;
      d.targets.push(g);
    }

    d.targets.forEach(g=>{
      g.x+=(d.x-g.x)*0.04;
      g.y+=(d.y-g.y)*0.04;
      g.sad-=20*dt;

      if(g.sad<=0){
        markGrumpyHappy(g);
      }
    });
  });
}

// No phrase here should read as encouragement to walk on: a grumpy reaching
// the exit still sad is the lose condition. "keep going" cheered them toward
// it, so it is gone.
const affirmations=[
  "you're great",
  "you can do it",
  "i love you",
  "you're valued",
  "you belong",
  "stay a while",
  "you matter"
];
const textBubbles=[];

function applyAffirmations(dt){
  affirmBuddies.forEach(t=>{
    if (t.isGrumpy) {
      t.target = null;
      return;
    }
    if (
      t.target &&
      (t.target.isHappy || t.target.reachedEnd)
    ) {
      t.target = null;
    }

    if(!t.target){
      for(let g of state.grumpies){
        if(!g.active||g.isHappy) continue;
        if(g.ignoresAffirmations) continue;
        if(Math.hypot(g.x-t.x,g.y-t.y)<t.range){
          t.target=g;
          break;
        }
      }
    }

    if(t.target){
      const g=t.target;
      g.sad-=25*dt;

      if(g.sad<=0){
        markGrumpyHappy(g);
        t.target=null;
      }

      t.cooldown-=dt;
      if(t.cooldown<=0){
        t.cooldown=0.8;
        const msg =
          affirmations[
            (Math.random()*affirmations.length)|0
          ];

        textBubbles.push({
          text: msg,
          x:t.x,
          y:t.y-18,
          target:g,
          life:1.2,
          speed:220,
          hit:false
        });
      }
    }
  });
}

function findNearestSadGrumpy(x, y, range) {
  let nearest = null;
  let nearestDistance = range;

  for (const grumpy of state.grumpies) {
    if (!grumpy.active || grumpy.isHappy || grumpy.reachedEnd) continue;

    const distance = Math.hypot(grumpy.x - x, grumpy.y - y);
    if (distance < nearestDistance) {
      nearest = grumpy;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function cheerUpWithRainbow(grumpy, dt) {
  grumpy.sad -= UNICORN_SAD_RELIEF * dt;
  if (grumpy.sad <= 0) markGrumpyHappy(grumpy);
}

function applyHappyHorn(dt) {
  // Grumpies already helped this frame. A grumpy can be both the one HappyHorn
  // is circling and standing on her rainbow, and should only benefit once.
  const helped = new Set();

  unicorns.forEach(u => {
    if (u.isGrumpy) {
      u.target = null;
      return;
    }

    // Stay with the same grumpy until they cheer up or leave, so she does not
    // flicker between two equally close targets.
    if (u.target && (!u.target.active || u.target.isHappy || u.target.reachedEnd)) {
      u.target = null;
    }

    if (!u.target) {
      u.target = findNearestSadGrumpy(u.homeX, u.homeY, UNICORN_SEEK_RANGE);
    }

    // With nobody to help she circles her own cell, so she is never still.
    const centerX = u.target ? u.target.x : u.homeX;
    const centerY = u.target ? u.target.y : u.homeY;

    u.angle += UNICORN_ORBIT_SPEED * dt;

    // The circle is squashed vertically so it reads as a loop on the ground
    // rather than a flat ring.
    const orbitX = centerX + Math.cos(u.angle) * UNICORN_ORBIT_RADIUS;
    const orbitY = centerY + Math.sin(u.angle) * UNICORN_ORBIT_RADIUS * 0.6;

    // Fly toward the orbit point instead of snapping to it, so switching
    // targets looks like a flight path.
    const dx = orbitX - u.x;
    const dy = orbitY - u.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      const step = Math.min(UNICORN_FLY_SPEED * dt, distance);
      u.x += (dx / distance) * step;
      u.y += (dy / distance) * step;
    }

    u.dropTimer -= dt;
    if (u.dropTimer <= 0) {
      u.dropTimer = RAINBOW_DROP_INTERVAL;
      u.colorIndex = (u.colorIndex + 1) % RAINBOW_COLORS.length;
      rainbowTrail.push({
        x: u.x,
        y: u.y,
        c: RAINBOW_COLORS[u.colorIndex],
        life: RAINBOW_LIFE
      });
    }

    // The grumpy she is circling sits inside the loop, so the trail itself
    // sweeps around them rather than over them. She tends to them directly
    // instead of waiting for the rainbow to catch them by accident.
    if (u.target && !helped.has(u.target)) {
      helped.add(u.target);
      cheerUpWithRainbow(u.target, dt);
      if (u.target.isHappy) u.target = null;
    }
  });

  updateRainbowTrail(dt, helped);
}

function updateRainbowTrail(dt, helped) {
  for (let i = rainbowTrail.length - 1; i >= 0; i--) {
    rainbowTrail[i].life -= dt;
    if (rainbowTrail[i].life <= 0) rainbowTrail.splice(i, 1);
  }

  if (!rainbowTrail.length) return;

  // Relief is applied once per grumpy per frame. Charging it per segment would
  // make the rainbow's strength depend on how densely it happens to be drawn.
  state.grumpies.forEach(grumpy => {
    if (!grumpy.active || grumpy.isHappy || grumpy.reachedEnd) return;
    if (helped.has(grumpy)) return;

    const touching = rainbowTrail.some(
      segment =>
        Math.hypot(grumpy.x - segment.x, grumpy.y - segment.y) < RAINBOW_TOUCH_RADIUS
    );

    if (!touching) return;

    cheerUpWithRainbow(grumpy, dt);
  });
}

// He used to sour anything within 90px, taking a full 5 seconds about it, which
// meant he mostly drifted past doing nothing. Now it is contact range and half
// a second, so walking him into your crew wrecks it - and placement off his
// route is the counter-play.
const NEIL_TOUCH_RANGE = 34;      // his radius plus a buddy's: actual contact
const NEIL_DISABLE_TIME = 0.5;    // seconds of contact to sour a buddy
const NEIL_RECOVER_TIME = 2;      // seconds to shake it off once he has moved on

function applyNegativeNeil(dt) {
  state.grumpies.forEach(grumpy => {
    if (!grumpy.active || grumpy.isHappy || grumpy.name !== "Negative Neil") return;

    forEachBuddy((buddy, kind) => {
      // HappyHorn is the one he cannot sour. Without this she is actively bad
      // against him: she orbits her target at 34px, well inside his 90px
      // aura, so she would fly in and be disabled within about five seconds.
      if (kind === "unicorn") return;

      const distance = Math.hypot(grumpy.x - buddy.x, grumpy.y - buddy.y);

      if (distance < NEIL_TOUCH_RANGE) {
        buddy.grumpiness = Math.min(1, (buddy.grumpiness || 0) + dt / NEIL_DISABLE_TIME);
      } else if (!buddy.isGrumpy) {
        buddy.grumpiness = Math.max(0, (buddy.grumpiness || 0) - dt / NEIL_RECOVER_TIME);
      }

      buddy.isGrumpy = (buddy.grumpiness || 0) >= 1;
    });
  });
}

function updateTextBubbles(dt){
  for(let i=textBubbles.length-1;i>=0;i--){
    const b=textBubbles[i];
    b.life-=dt;

    if(b.target && !b.target.reachedEnd && !b.target.inHappyHangout){
      const targetX=b.target.x;
      const targetY=b.target.y-18;
      const dx=targetX-b.x;
      const dy=targetY-b.y;
      const d=Math.hypot(dx,dy);

      if(d>1){
        const step=Math.min(b.speed*dt,d);
        b.x+=(dx/d)*step;
        b.y+=(dy/d)*step;
      } else {
        b.hit=true;
      }
    } else {
      b.y-=30*dt;
    }

    if(b.hit){
      b.y-=12*dt;
    }

    if(b.life<=0){
      textBubbles.splice(i,1);
    }
  }
}

// =========================
// INPUT
// =========================
let mouse={x:0,y:0};
let preview={cx:0,cy:0,valid:true};
let selectedBuddy="hug";
const prefersCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
const placementMenu = {
  active: false,
  cx: 0,
  cy: 0
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPlacementMenuButtons(cx, cy) {
  const centerX = cx * GRID_SIZE + GRID_SIZE / 2;
  const centerY = cy * GRID_SIZE + GRID_SIZE / 2;
  const width = prefersCoarsePointer ? 140 : 116;
  const height = prefersCoarsePointer ? 40 : 28;

  const rows = Math.ceil(buildMenuButtons.length / BUILD_MENU_COLS);
  const blockWidth = BUILD_MENU_COLS * width + (BUILD_MENU_COLS - 1) * BUILD_MENU_GAP;
  const blockHeight = rows * height + (rows - 1) * BUILD_MENU_GAP;

  // The menu sits beside the selected cell so the placement preview underneath
  // stays visible. Clamping the block as a whole, rather than each button on
  // its own, is what keeps buttons off each other near an edge: a button's
  // position is a fixed offset inside the block. The old per-direction layout
  // could not fit a fifth button, because each button is far wider than the
  // 40px cell and so any diagonal overlapped a cardinal one.
  const gapFromCell = GRID_SIZE / 2 + BUILD_MENU_GAP;
  const fitsOnRight = centerX + gapFromCell + blockWidth + 4 <= canvas.width;

  const blockX = clamp(
    fitsOnRight ? centerX + gapFromCell : centerX - gapFromCell - blockWidth,
    4,
    canvas.width - blockWidth - 4
  );
  const blockY = clamp(
    centerY - blockHeight / 2,
    BUILD_MENU_TOP,
    canvas.height - blockHeight - 4
  );

  return buildMenuButtons.map((button, index) => ({
    ...button,
    x: blockX + (index % BUILD_MENU_COLS) * (width + BUILD_MENU_GAP),
    y: blockY + Math.floor(index / BUILD_MENU_COLS) * (height + BUILD_MENU_GAP),
    w: width,
    h: height
  }));
}

function getPlacementMenuButtonAt(x, y) {
  if (!placementMenu.active) return null;

  const buttons = getPlacementMenuButtons(
    placementMenu.cx,
    placementMenu.cy
  );

  for (const button of buttons) {
    if (
      x >= button.x &&
      x <= button.x + button.w &&
      y >= button.y &&
      y <= button.y + button.h
    ) {
      return button;
    }
  }

  return null;
}

function getInstructionButtonLabel() {
  const isLastPage =
    state.instructionPageIndex >= state.instructionPages.length - 1;
  return isLastPage ? `Start Round ${state.pendingRound}` : "Next";
}

function advanceInstructions() {
  if (state.instructionPageIndex < state.instructionPages.length - 1) {
    state.instructionPageIndex++;
    return;
  }

  startRound(state.pendingRound);
  state.instructionPages = [];
  state.instructionPageIndex = 0;
  state.gameMode = "playing";
}

function resumeFromPause() {
  state.gameMode = "playing";
}

function returnToMainMenu() {
  placementMenu.active = false;
  state.instructionPages = [];
  state.instructionPageIndex = 0;
  state.gameMode = "menu";
}

function getCanvasPoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function updatePreviewAtCell(cx, cy) {
  preview.cx = cx;
  preview.cy = cy;

  const key = cellKey(cx, cy);
  const isInsideGrid = cx >= 0 && cy >= 0 && cx < grid.cols && cy < grid.rows;
  const isSpawnCell = cx === START.x && cy === START.y;
  const isHappyHangoutCell = doesCellOverlapRect(cx, cy, HAPPY_HANGOUT);
  const isCookieCell = !!cookieAtCell(cx, cy);

  if (!isInsideGrid || isSpawnCell || isHappyHangoutCell || isCookieCell || grid.blocked.has(key)) {
    preview.valid = false;
    return;
  }

  grid.blocked.add(key);
  preview.valid = !!findPath(START, END);
  grid.blocked.delete(key);
}

function handleInput(x,y,click=false){

if (state.gameMode === "menu") {
  if (click) {
    if (state.menuCreditsOpen) {
      if (pointInRect(x, y, creditsCloseButton)) {
        state.menuCreditsOpen = false;
      }
      return;
    }

    if (pointInRect(x, y, startButton)) {
      startGame(false);
      return;
    }

    if (state.advancedUnlocked && pointInRect(x, y, advancedModeButton)) {
      startGame(true);
      return;
    }

    if (pointInRect(x, y, creditsButton)) {
      state.menuCreditsOpen = true;
    }
  }
  return;
}

  if (state.gameMode === "instructions") {
    if (click && pointInRect(x, y, instructionButton)) {
      advanceInstructions();
    }
    return;
  }

  if (state.gameMode === "paused") {
    if (click && pointInRect(x, y, pauseContinueButton)) {
      resumeFromPause();
      return;
    }

    if (click && pointInRect(x, y, pauseMenuButton)) {
      returnToMainMenu();
      return;
    }

    if (click && pointInRect(x, y, pauseMusicButton)) {
      setMusicOn(!musicOn);
    }
    return;
  }

  if(state.gameMode==="gameover"){
    placementMenu.active = false;
    if(click) state.gameMode="menu";
    return;
  }

  if (click && pointInRect(x, y, pauseButton)) {
    placementMenu.active = false;
    state.pausedFromRound = state.currentRound;
    state.gameMode = "paused";
    return;
  }

  mouse.x=x; mouse.y=y;
  const {cx,cy}=getCell(x,y);

  if (placementMenu.active) {
    updatePreviewAtCell(placementMenu.cx, placementMenu.cy);

    const menuButton = getPlacementMenuButtonAt(x, y);
    if (menuButton) {
      if (click && canPlaceBuddy(menuButton.buddyType)) {
        selectedBuddy = menuButton.buddyType;
        placeBuddy(placementMenu.cx, placementMenu.cy, menuButton.buddyType);
        placementMenu.active = false;
      }
      return;
    }

    if (click) {
      placementMenu.active = false;
    } else {
      return;
    }
  }

  updatePreviewAtCell(cx, cy);

  if(click && preview.valid){
    placementMenu.active = true;
    placementMenu.cx = cx;
    placementMenu.cy = cy;
  }
}

function placeBuddy(cx,cy,buddyType=selectedBuddy,free=false){
  // `free` skips the cost only. The one-hero rule still applies, so the
  // Advanced-Mode gift cannot be stacked with a bought HappyHorn.
  if(free ? (buddyType === "unicorn" && unicorns.length > 0) : !canPlaceBuddy(buddyType)) return;
  if (doesCellOverlapRect(cx, cy, HAPPY_HANGOUT)) return;
  // Would hide the cookie and can wall it off from the Stress Eater. The
  // preview already refuses these cells; this is the same guard as the
  // Happy Hangout one above, so the rule holds however placeBuddy is reached.
  if (cookieAtCell(cx, cy)) return;

  if(!free) state.careCredits-=buddyCosts[buddyType];

  const x=cx*GRID_SIZE+20;
  const y=cy*GRID_SIZE+20;

  const baseBuddy = {
    x,
    y,
    grumpiness: 0,
    isGrumpy: false
  };

  if(buddyType==="hug") hugBuddies.push({...baseBuddy, range:52, target:null});
  if(buddyType==="dog") therapyDogs.push({...baseBuddy, speed:60, range:120, targets:[]});
  if(buddyType==="affirm") affirmBuddies.push({...baseBuddy, range:140, target:null, cooldown:0});
  if(buddyType==="radio") radioBuddies.push({...baseBuddy, radius:120});
  if(buddyType==="unicorn") unicorns.push({
    ...baseBuddy,
    homeX: x,
    homeY: y,
    angle: 0,
    dropTimer: 0,
    colorIndex: 0,
    target: null
  });

  grid.blocked.add(cellKey(cx,cy));
  refreshGrumpyPaths();
}

canvas.addEventListener("pointermove", e => {
  const point = getCanvasPoint(e.clientX, e.clientY);
  if (e.pointerType === "mouse" || placementMenu.active) {
    handleInput(point.x, point.y, false);
  }
});

canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  startAudio();
  const point = getCanvasPoint(e.clientX, e.clientY);
  handleInput(point.x, point.y, true);
});

window.addEventListener('keydown', e=>{
  if (e.key==='1') selectedBuddy='hug';
  if (e.key==='2') selectedBuddy='dog';
  if (e.key==='3') selectedBuddy='affirm';
  if (e.key==='4') selectedBuddy='radio';
  if (e.key==='5') selectedBuddy='unicorn';
});

// =========================
// LOOP
// =========================
function loop(t){
  // Clamp the step. A backgrounded tab throttles requestAnimationFrame, and an
  // unclamped dt would teleport grumpies past buddies the moment the game comes
  // back into view (and the first frame's dt is the whole page lifetime).
  const dt=Math.min((t-last)/1000,1/30);
  last=t;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt){
  updateMusic();

  if(state.gameMode==="menu"){
    updateMenuGrumpies(dt);
    return;
  }

  if(state.gameMode==="instructions") return;
  if(state.gameMode==="paused") return;

  if(state.gameMode!=="playing") return;

  state.grumpies.forEach(g=>g.update(dt));

  applyCareCredits(dt);
  applyHugs(dt);
  applyTherapyDogs(dt);
  applyAffirmations(dt);
  applyHappyHorn(dt);
  applyNegativeNeil(dt);
  updateTextBubbles(dt);

  if(state.escapedSad>=state.maxEscaped){
    state.gameMode="gameover";
    state.win=false;
  }

  const roundResolved =
    state.grumpies.length > 0 &&
    state.grumpies.every(g => g.isHappy || g.reachedEnd);

  if(roundResolved){
    if (state.currentRound >= state.totalRounds) {
      if (!state.advancedUnlocked) {
        state.advancedUnlocked = true;
        state.justUnlockedAdvanced = true;
      }
      state.gameMode="gameover";
      state.win=true;
    } else {
      beginRoundFlow(state.currentRound + 1);
    }
  }

}

function drawPixelArt(ctx, x, y, pixels, size=4) {
  pixels.forEach(p => {
    ctx.fillStyle = p.c;
    ctx.fillRect(
      x + p.x * size,
      y + p.y * size,
      size,
      size
    );
  });
}

function drawPixelArtWithBounce(ctx, x, y, pixels, size=4, tOffset=0, amp=2, speed=0.005){
  const offsetY = Math.sin(performance.now()*speed + tOffset) * amp;
  pixels.forEach(p => {
    ctx.fillStyle = p.c;
    ctx.fillRect(
      x + p.x * size,
      y + p.y * size + offsetY,
      size,
      size
    );
  });
}

function drawBuddySpriteCentered(ctx, centerX, centerY, pixels, size, tOffset, amp, speed) {
  const topLeftX = centerX - (BUDDY_PIXEL_DIM * size) / 2;
  const topLeftY = centerY - (BUDDY_PIXEL_DIM * size) / 2;
  drawPixelArtWithBounce(ctx, topLeftX, topLeftY, pixels, size, tOffset, amp, speed);
}

function drawRainbowTrail(ctx) {
  rainbowTrail.forEach(segment => {
    const fade = segment.life / RAINBOW_LIFE;

    ctx.globalAlpha = fade * 0.7;
    ctx.fillStyle = segment.c;
    ctx.beginPath();
    ctx.arc(segment.x, segment.y, 3 + fade * 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
}

function drawBuddyGrumpiness(ctx, buddy) {
  ctx.fillStyle = "rgba(40, 20, 30, 0.5)";
  ctx.beginPath();
  ctx.arc(buddy.x, buddy.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2b1f1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(buddy.x, buddy.y + 3, 5, 1.15 * Math.PI, 1.85 * Math.PI);
  ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(state.gameMode==="menu"){
    ensureMenuGrumpies();

    ctx.fillStyle="#10233f";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="#1d4f7a";
    ctx.fillRect(0,0,canvas.width,canvas.height*0.62);

    ctx.fillStyle="#254a2d";
    ctx.fillRect(0,canvas.height*0.62,canvas.width,canvas.height*0.38);

    ctx.fillStyle="rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.arc(130,70,36,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(170,60,26,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(610,82,28,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(645,72,22,0,Math.PI*2);
    ctx.fill();

    // HappyHorn takes the centre spot as the theme hero; the megaphone moves
    // out to the far right.
    drawBuddySpriteCentered(ctx, 105, 215, buddyPixelArt.hug, 6, 0.2, 2, 0.004);
    drawBuddySpriteCentered(ctx, 245, 212, buddyPixelArt.dog, 6, 1.0, 2, 0.005);
    drawBuddySpriteCentered(ctx, 390, 212, buddyPixelArt.unicorn, 6, 3.4, 3, 0.007);
    drawBuddySpriteCentered(ctx, 535, 214, buddyPixelArt.radio, 6, 2.6, 2, 0.0055);
    drawBuddySpriteCentered(ctx, 678, 218, buddyPixelArt.affirm, 6, 1.8, 2, 0.0045);

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(50, 272);
    ctx.lineTo(canvas.width - 50, 272);
    ctx.moveTo(canvas.width / 2, 205);
    ctx.lineTo(canvas.width / 2, canvas.height - 18);
    ctx.stroke();

    menuGrumpies.forEach(grumpy => drawGrumpySprite(ctx, grumpy, false));

    ctx.fillStyle="rgba(255,255,255,0.12)";
    ctx.fillRect(70,235,640,6);

    ctx.fillStyle="white";
    ctx.font="bold 48px sans-serif";
    ctx.textAlign="center";
    ctx.fillText("KINDNESS TD",canvas.width/2,105);

    ctx.font="18px sans-serif";
    ctx.fillStyle="#ffd9f4";
    ctx.fillText("Help grumpies feel better",canvas.width/2,138);

    ctx.fillStyle="#2c89ff";
    ctx.fillRect(startButton.x,startButton.y,startButton.w,startButton.h);
    if (state.advancedUnlocked) {
      ctx.fillStyle = "#7a3db8";
      ctx.fillRect(
        advancedModeButton.x,
        advancedModeButton.y,
        advancedModeButton.w,
        advancedModeButton.h
      );
    }
    ctx.fillStyle="#ff7ab6";
    ctx.fillRect(creditsButton.x,creditsButton.y,creditsButton.w,creditsButton.h);

    ctx.strokeStyle="white";
    ctx.lineWidth=3;
    ctx.strokeRect(startButton.x,startButton.y,startButton.w,startButton.h);
    if (state.advancedUnlocked) {
      ctx.strokeRect(
        advancedModeButton.x,
        advancedModeButton.y,
        advancedModeButton.w,
        advancedModeButton.h
      );
    }
    ctx.strokeRect(creditsButton.x,creditsButton.y,creditsButton.w,creditsButton.h);

    ctx.fillStyle="white";
    ctx.font="20px sans-serif";
    ctx.fillText("Start Game",canvas.width/2,startButton.y+32);
    if (state.advancedUnlocked) {
      ctx.font = "18px sans-serif";
      ctx.fillText(
        "Advanced Mode",
        advancedModeButton.x + advancedModeButton.w / 2,
        advancedModeButton.y + 30
      );
    }

    ctx.font="18px sans-serif";
    ctx.fillText("Credits", canvas.width / 2, creditsButton.y + 26);

    if (state.menuCreditsOpen) {
      ctx.fillStyle = "rgba(7, 16, 28, 0.76)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#15263f";
      ctx.fillRect(canvas.width / 2 - 170, 70, 340, 220);
      ctx.strokeStyle = "#f0f6ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 170, 70, 340, 220);

      ctx.fillStyle = "white";
      ctx.font = "bold 28px sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText("Credits", canvas.width / 2, 92);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#ffd7e8";
      wrapText(
        ctx,
        "This game was made by EricOP, Asa, and Thea. Codex and Claude were our hard-working robotic partners.",
        canvas.width / 2,
        138,
        270,
        28
      );

      ctx.fillStyle = "#2c89ff";
      ctx.fillRect(
        creditsCloseButton.x,
        creditsCloseButton.y,
        creditsCloseButton.w,
        creditsCloseButton.h
      );
      ctx.strokeStyle = "white";
      ctx.strokeRect(
        creditsCloseButton.x,
        creditsCloseButton.y,
        creditsCloseButton.w,
        creditsCloseButton.h
      );
      ctx.fillStyle = "white";
      ctx.font = "18px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "Back",
        creditsCloseButton.x + creditsCloseButton.w / 2,
        creditsCloseButton.y + creditsCloseButton.h / 2
      );
    }
    return;
  }

  if (state.gameMode === "instructions") {
    const page =
      state.instructionPages[state.instructionPageIndex] || {
        title: "",
        body: ""
      };

    ctx.fillStyle = "#0b1630";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(70, 34, canvas.width - 140, canvas.height - 88);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 34, canvas.width - 140, canvas.height - 88);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(page.title, canvas.width / 2, 58);

    ctx.font = "17px sans-serif";
    ctx.fillStyle = "#e7eefc";
    wrapText(
      ctx,
      page.body,
      canvas.width / 2,
      112,
      500,
      26
    );

    if (page.buddyIcon) {
      // Sits higher than the grumpy icons because a 10x10 buddy sprite at this
      // scale is taller and would otherwise run into the page counter.
      drawBuddySpriteCentered(
        ctx,
        canvas.width / 2,
        224,
        buddyPixelArt[page.buddyIcon],
        5,
        0,
        3,
        0.008
      );
    }

    if (page.icon) {
      drawGrumpySprite(
        ctx,
        {
          x: canvas.width / 2,
          y: 245,
          sad: page.icon.isBoss ? (page.icon.bossHp || 1000) : 100,
          maxSad: page.icon.isBoss ? (page.icon.bossHp || 1000) : 100,
          isHappy: false,
          isHugged: false,
          hasHeadphones: !!page.icon.hasHeadphones,
          hasDogAllergy: !!page.icon.hasDogAllergy,
          avoidsHugs: !!page.icon.avoidsHugs,
          isBoss: !!page.icon.isBoss,
          isStressEater: !!page.icon.isStressEater,
          eatTimer: 0,
          scale: page.icon.isBoss ? 1.5 : page.icon.isStressEater ? 1.25 : 1,
          name: page.icon.isBoss ? (page.icon.bossName || "Negative Neil") : ""
        },
        false
      );
    }

    ctx.fillStyle = "#2c89ff";
    ctx.fillRect(
      instructionButton.x,
      instructionButton.y,
      instructionButton.w,
      instructionButton.h
    );

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      instructionButton.x,
      instructionButton.y,
      instructionButton.w,
      instructionButton.h
    );

    ctx.fillStyle = "white";
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(
      getInstructionButtonLabel(),
      instructionButton.x + instructionButton.w / 2,
      instructionButton.y + instructionButton.h / 2
    );

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#bfd4ff";
    ctx.fillText(
      `Page ${state.instructionPageIndex + 1}/${state.instructionPages.length}`,
      canvas.width / 2,
      instructionButton.y - 24
    );
    return;
  }

  if(state.gameMode==="gameover"){
    // Beating Advanced is the end of the whole game, so it gets its own layout
    // with room for the verse rather than the one-line sign-off.
    const advancedWin = state.win && state.advancedMode;

    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="white";
    ctx.font="32px sans-serif";
    ctx.textAlign="center";
    ctx.textBaseline="alphabetic";
    ctx.fillText(
      state.win?"You spread kindness!":"You have lost!",
      canvas.width/2, advancedWin ? 84 : 162
    );

    if (advancedWin) {
      ctx.font = "19px sans-serif";
      ctx.fillStyle = "#ffd7e8";
      wrapText(
        ctx,
        "Wow, You Did Great! Now go out and show kindness in real life!",
        canvas.width / 2, 130, 560, 25
      );

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#e7eefc";
      wrapText(
        ctx,
        "\u201cBe kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.\u201d",
        canvas.width / 2, 200, 560, 23
      );

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#a9b8d4";
      ctx.fillText("Ephesians 4:32", canvas.width / 2, 268);
    } else if (state.win) {
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#ffd7e8";
      wrapText(
        ctx,
        state.justUnlockedAdvanced
          ? "Love and kindness are awesome to spread. Maybe we'll let you face some advanced grumpy people now."
          : "Love and kindness are awesome to spread. Advanced grumpy people are waiting if you want a tougher run.",
        canvas.width / 2,
        208,
        420,
        26
      );
    }

    ctx.fillStyle = "white";
    ctx.font="20px sans-serif";
    ctx.fillText("Tap to return to menu", canvas.width/2, advancedWin ? 322 : 290);
    return;
  }

  // preview
  ctx.fillStyle=preview.valid?'rgba(0,255,0,0.3)':'rgba(255,0,0,0.4)';
  ctx.fillRect(preview.cx*GRID_SIZE,preview.cy*GRID_SIZE,GRID_SIZE,GRID_SIZE);

  ctx.fillStyle = "#2f6f4f";
  ctx.fillRect(
    HAPPY_HANGOUT.x,
    HAPPY_HANGOUT.y,
    HAPPY_HANGOUT.width,
    HAPPY_HANGOUT.height
  );
  ctx.strokeStyle = "#b7ffd3";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    HAPPY_HANGOUT.x,
    HAPPY_HANGOUT.y,
    HAPPY_HANGOUT.width,
    HAPPY_HANGOUT.height
  );
  ctx.fillStyle = "white";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "Happy Hangout",
    HAPPY_HANGOUT.x + HAPPY_HANGOUT.width / 2,
    HAPPY_HANGOUT.y + HAPPY_HANGOUT.height / 2
  );

  // hugBuddies.forEach(t=>{
  //   ctx.fillStyle='brown';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,12,0,Math.PI*2);
  //   ctx.fill();
  // });
  drawCookies(ctx);
  drawRainbowTrail(ctx);

  hugBuddies.forEach((t,i)=>{
    drawBuddySpriteCentered(ctx, t.x, t.y, buddyPixelArt.hug, 4, i*0.5, 2, 0.006);
    if (t.isGrumpy) drawBuddyGrumpiness(ctx, t);
  });

  // therapyDogs.forEach(d=>{
  //   ctx.fillStyle='orange';
  //   ctx.beginPath();
  //   ctx.arc(d.x,d.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  therapyDogs.forEach((d,i)=>{
    drawBuddySpriteCentered(ctx, d.x, d.y, buddyPixelArt.dog, 4, i*0.3, 1.5, 0.007);
    if (d.isGrumpy) drawBuddyGrumpiness(ctx, d);
  });

  // affirmBuddies.forEach(t=>{
  //   ctx.fillStyle='purple';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  affirmBuddies.forEach((t,i)=>{
    drawBuddySpriteCentered(ctx, t.x, t.y, buddyPixelArt.affirm, 4, i*0.2, 1.8, 0.008);
    if (t.isGrumpy) drawBuddyGrumpiness(ctx, t);
  });

  // radioBuddies.forEach(t=>{
  //   ctx.strokeStyle='cyan';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
  //   ctx.stroke();

  //   ctx.fillStyle='blue';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  radioBuddies.forEach((t,i)=>{
    ctx.strokeStyle='rgba(0,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
    ctx.stroke();

    drawBuddySpriteCentered(ctx, t.x, t.y, buddyPixelArt.radio, 4, i*0.4, 2.5, 0.005);
    if (t.isGrumpy) drawBuddyGrumpiness(ctx, t);
  });

  unicorns.forEach((u,i)=>{
    // Mark her home cell faintly so the player can still see the tile she
    // occupies while she is off circling a grumpy.
    ctx.strokeStyle = "rgba(185,140,255,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(u.homeX - 18, u.homeY - 18, 36, 36);

    drawBuddySpriteCentered(ctx, u.x, u.y, buddyPixelArt.unicorn, 4, i*0.6, 2.5, 0.009);
    if (u.isGrumpy) drawBuddyGrumpiness(ctx, u);
  });

  state.grumpies.forEach(g=>{
    if (!g.reachedEnd) g.draw(ctx);
  });

  textBubbles.forEach(b=>{
    if (b.style === "reward") {
      ctx.fillStyle = "#ff7ab6";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.text, b.x, b.y);
      return;
    }

    const bubbleWidth=Math.max(64,b.text.length*7+18);
    const bubbleHeight=24;

    ctx.fillStyle="rgba(255,255,255,0.92)";
    ctx.strokeStyle="#7a3db8";
    ctx.lineWidth=2;
    ctx.fillRect(
      b.x-bubbleWidth/2,
      b.y-bubbleHeight/2,
      bubbleWidth,
      bubbleHeight
    );
    ctx.strokeRect(
      b.x-bubbleWidth/2,
      b.y-bubbleHeight/2,
      bubbleWidth,
      bubbleHeight
    );

    ctx.fillStyle="#7a3db8";
    ctx.font="12px sans-serif";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(b.text,b.x,b.y);
  });

  ctx.fillStyle='white';
  ctx.font = "16px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Care Credits: ${state.careCredits}`,10,20);
  ctx.fillText(`Round: ${state.currentRound}/${state.totalRounds}`,10,40);
  ctx.fillText(`Missed Hearts: ${state.escapedSad}/${state.maxEscaped}`,10,60);
  if (state.advancedMode) {
    ctx.fillText("ADV Mode", 10, 80);
  }

  ctx.fillStyle = state.gameMode === "paused" ? "#40566f" : "#2f4762";
  ctx.fillRect(pauseButton.x, pauseButton.y, pauseButton.w, pauseButton.h);
  ctx.strokeStyle = "#f2f7ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(pauseButton.x, pauseButton.y, pauseButton.w, pauseButton.h);
  ctx.fillStyle = "white";
  ctx.font = "15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Pause", pauseButton.x + pauseButton.w / 2, pauseButton.y + pauseButton.h / 2);

  if (placementMenu.active) {
    const buttons = getPlacementMenuButtons(
      placementMenu.cx,
      placementMenu.cy
    );

    for (const button of buttons) {
      const canBuild = canPlaceBuddy(button.buddyType);

      ctx.fillStyle = "#243b55";
      ctx.fillRect(button.x, button.y, button.w, button.h);

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(button.x, button.y, button.w, button.h);

      ctx.fillStyle = canBuild ? "#ffffff" : "#8a8a8a";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${button.label} (${buddyCosts[button.buddyType]})`,
        button.x + button.w / 2,
        button.y + button.h / 2
      );
    }
  }



  if (state.gameMode === "paused") {
    ctx.fillStyle = "rgba(7, 16, 28, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#15263f";
    ctx.fillRect(canvas.width / 2 - 150, 100, 300, 250);
    ctx.strokeStyle = "#f0f6ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 150, 100, 300, 250);

    ctx.fillStyle = "white";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Paused", canvas.width / 2, 120);

    ctx.font = "15px sans-serif";
    ctx.fillStyle = "#d9e7ff";
    ctx.fillText(`Round ${state.pausedFromRound} is waiting for you`, canvas.width / 2, 154);

    ctx.fillStyle = "#2e8b57";
    ctx.fillRect(
      pauseContinueButton.x,
      pauseContinueButton.y,
      pauseContinueButton.w,
      pauseContinueButton.h
    );
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      pauseContinueButton.x,
      pauseContinueButton.y,
      pauseContinueButton.w,
      pauseContinueButton.h
    );
    ctx.fillStyle = "white";
    ctx.font = "18px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Continue Game",
      pauseContinueButton.x + pauseContinueButton.w / 2,
      pauseContinueButton.y + pauseContinueButton.h / 2
    );

    ctx.fillStyle = "#8d395c";
    ctx.fillRect(
      pauseMenuButton.x,
      pauseMenuButton.y,
      pauseMenuButton.w,
      pauseMenuButton.h
    );
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      pauseMenuButton.x,
      pauseMenuButton.y,
      pauseMenuButton.w,
      pauseMenuButton.h
    );
    ctx.fillStyle = "white";
    ctx.fillText(
      "Return To Main Screen",
      pauseMenuButton.x + pauseMenuButton.w / 2,
      pauseMenuButton.y + pauseMenuButton.h / 2
    );

    ctx.fillStyle = musicOn ? "#2f6a4a" : "#4a3350";
    ctx.fillRect(
      pauseMusicButton.x,
      pauseMusicButton.y,
      pauseMusicButton.w,
      pauseMusicButton.h
    );
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      pauseMusicButton.x,
      pauseMusicButton.y,
      pauseMusicButton.w,
      pauseMusicButton.h
    );
    ctx.fillStyle = "white";
    ctx.fillText(
      musicOn ? "Music: On" : "Music: Off",
      pauseMusicButton.x + pauseMusicButton.w / 2,
      pauseMusicButton.y + pauseMusicButton.h / 2
    );
  }
}

requestAnimationFrame(loop);
