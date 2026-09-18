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
const ROUND_SAD_INCREASE = 25;
const ROUND_SAD_PER_LEVEL = 2;   // every round past the first, on top of the steeper climb after EASY_ROUNDS

// Difficulty multiplies the per-round climb only, not the flat base 100, so round 1 is the same gentle opening on
// every setting and the challenge lands where the game was going slack: late rounds, once a good crew is compounding.
// Two names each - the full title labels the menu button and the short one fits the in-game HUD. `heart` is the pixel
// size of the heart drawn on that button, so the bigger the challenge, the bigger the heart you bring to it.
const DIFFICULTIES = [
  { name: "Casual", label: "Casual Complimenter", mult: 1, heart: 2 },
  { name: "Normal", label: "Normal Encourager", mult: 5, heart: 4 },
  { name: "Expert", label: "Expert Hugger", mult: 10, heart: 6 }
];

// 7x6 pixel heart, built from rows rather than a hand-listed pixel array: `X` is the body, `o` the highlight.
const HEART_ROWS = [
  ".XX.XX.",
  "XoXXXXX",
  "XoXXXXX",
  ".XXXXX.",
  "..XXX..",
  "...X..."
];
const HEART_COLS = HEART_ROWS[0].length;
const HEART_PIXELS = [];
HEART_ROWS.forEach((row, y) => {
  [...row].forEach((cell, x) => {
    if (cell !== ".") HEART_PIXELS.push({ x, y, c: cell === "o" ? "#ffd0e4" : "#ff5f9e" });
  });
});

try {
  const savedDifficulty = +localStorage.getItem("ktd:diff");
  if (DIFFICULTIES[savedDifficulty]) state.difficulty = savedDifficulty;
} catch (e) {}

function setDifficulty(index) {
  state.difficulty = index;
  try { localStorage.setItem("ktd:diff", index); } catch (e) {}
}

const NORMAL_BASE_SAD = 100;

// The climb before the challenge level is applied. Bosses need it to work out how much the wave around them grew.
function getRawRoundSadBonus(roundNumber) {
  return Math.max(0, roundNumber - 1) * ROUND_SAD_PER_LEVEL
       + Math.max(0, roundNumber - EASY_ROUNDS) * ROUND_SAD_INCREASE;
}

function getRoundSadBonus(roundNumber) {
  return getRawRoundSadBonus(roundNumber) * DIFFICULTIES[state.difficulty].mult;
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

  let body = `${count} grumpies incoming, +${hpBonus} sad meter each.`;
  if (roundNumber < state.totalRounds) {
    const nextJump = getRoundSadBonus(roundNumber + 1) - hpBonus;
    body += ` Next round: +${ROUND_SPAWN_INCREASE} grumpies, +${nextJump} sad.`;
  }

  return { title: `Round ${roundNumber} Incoming`, body };
}

function getInstructionPages(roundNumber) {
  if (roundNumber === 1) {
    // Advanced Mode stays a surprise until it is earned, so the intro only
    // mentions it to someone already playing it, where it explains why
    // everything suddenly takes twice the kindness (hpMultiplier, createGrumpy).
    const intro = "Cheer up the grumpy hearts so they can go hang out in the Happy Hangout. Build your kindness crew to do it.";

    return [
      {
        title: "Round 1",
        body: state.advancedMode
          ? intro + " In Advanced Mode every grumpy and boss starts with twice the sadness."
          : intro
      },
      ...(state.advancedMode ? [{
        title: "The Stress Eater",
        body: "The Stress Eater heads for the nearest cookie instead of the exit, stopping to nibble. He carries twice the sadness, so use the time he wastes snacking.",
        icon: { isStressEater: true }
      }] : []),
      state.advancedMode
        ? {
            title: "Happy Horn Has Been Training",
            body: "You finished all ten rounds, so her rainbow now lasts three times as long. Click her to train her further: pink and blue fly faster, purple and gold paint stronger.",
            buddyIcon: "unicorn"
          }
        : {
            title: "Meet Happy Horn",
            body: "Your hero. She circles the nearest grumpy, painting a rainbow that cheers up everyone it touches. Free, but only one of her. Click her to train up: pink and blue fly faster, purple and gold paint stronger.",
            buddyIcon: "unicorn"
          }
    ];
  }

  if (roundNumber === 2) {
    return [
      {
        title: "Round 2",
        body: "Headphone grumpies tune out Affirming Words and Glad Radio. Use hugs or dogs instead.",
        icon: { hasHeadphones: true, hasDogAllergy: false }
      }
    ];
  }

  if (roundNumber === 3) {
    return [
      {
        title: "Round 3",
        body: "A mask means allergic to dogs. Therapy Dogs skip them, so use your other buddies.",
        icon: { hasHeadphones: false, hasDogAllergy: true }
      }
    ];
  }

  if (roundNumber === 4) {
    return [
      {
        title: "Round 4",
        body: "Thorns mean no hugs. Huggers leave them alone, so use words, radio, or dogs.",
        icon: { hasHeadphones: false, hasDogAllergy: false, avoidsHugs: true }
      }
    ];
  }

  if (roundNumber === 5) {
    return [
      {
        title: "Round 5 Boss Fight",
        body: "Headphone Hank tunes out Affirming Words and Glad Radio and has a massive grumpy heart, but he is still partial to pets, so Therapy Dogs can help.",
        icon: { isBoss: true, hasHeadphones: true, bossName: "Headphone Hank", bossHp: 1500 }
      }
    ];
  }

  if (roundNumber === 10) {
    return [
      {
        title: "Round 10 Boss Fight",
        body: "Anything Negative Neil brushes past goes grumpy in half a second, so keep your crew off his route. Happy Horn is the one he cannot sour - let her circle him.",
        icon: { isBoss: true, bossName: "Negative Neil", bossHp: 3000 }
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
  closePopupMenus();
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
  closePopupMenus();
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
      bossHp: 3000
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
const difficultyButton = {
  x: canvas.width / 2 - 185,
  y: 148,
  w: 370,
  h: 32
};
const creditsButton = {
  x: canvas.width / 2 - 85,
  y: canvas.height / 2 + 124,
  w: 170,
  h: 40
};
const musicToggleButton = {
  x: canvas.width - 46,
  y: 10,
  w: 36,
  h: 36
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
  unicorn: 0
};

const buildMenuButtons = [
  { label: "Hugger", buddyType: "hug" },
  { label: "TherapyDog", buddyType: "dog" },
  { label: "AffirmingWords", buddyType: "affirm" },
  { label: "GladRadio", buddyType: "radio" },
  { label: "Happy Horn", buddyType: "unicorn" }
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

// Levelling only recolours her coat: the golden horn, the rainbow mane and the violet hooves stay exactly where
// they were, so a trained HappyHorn still reads as HappyHorn rather than as some other unicorn.
const UNICORN_COAT_TINTS = [
  null,
  { "#ffffff": "#ff8dc2", "#fff6fb": "#ffaed4", "#ffc9de": "#e75f9e" },
  { "#ffffff": "#b98cff", "#fff6fb": "#cdaaff", "#ffc9de": "#8d5adb" },
  { "#ffffff": "#4dc3ff", "#fff6fb": "#71cfff", "#ffc9de": "#15b0ff" },
  { "#ffffff": "#ffd93d", "#fff6fb": "#ffe061", "#ffc9de": "#ffce05" }
];

const unicornArtByLevel = UNICORN_COAT_TINTS.map(tint =>
  tint
    ? buddyPixelArt.unicorn.map(pixel => (tint[pixel.c] ? { ...pixel, c: tint[pixel.c] } : pixel))
    : buddyPixelArt.unicorn
);

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

// =========================
// GRUMPY PIXEL ART
// Grumpies used to be smooth canvas arcs, which read as a different game to the pixel-art buddies standing next
// to them. Everything that makes up a grumpy now lands on the same kind of grid the buddies use: a 10x10 head,
// one block = 2px at scale 1, so the silhouette still measures the same 20px across as the old circle.
// =========================
// One block size for everything standing on the playfield. Grumpies used to draw at 2px a block against the
// buddies' 4px, which is what made them look like art from a different game even after they were pixelated: the
// blocks have to be the same size for the grid to read as one grid. At 4px a block a head needs 7 cells to still
// hold a face - 6 came out a rounded square with a letterbox for a mouth - so a grumpy is 28px against a 40px
// buddy: bigger than the 20px circle they used to be, and still clearly the smaller figure.
const PLAYFIELD_PIXEL_BLOCK = 4;
const GRUMPY_PIXEL_DIM = 7;
const GRUMPY_CENTER = (GRUMPY_PIXEL_DIM - 1) / 2;
const GRUMPY_RADIUS = (GRUMPY_PIXEL_DIM * PLAYFIELD_PIXEL_BLOCK) / 2;

// A circle on a grid is a ring of blocks, so the head, the headphone band and the thorns are all generated from
// one polar test rather than hand-listed. Cells outside the 10x10 head are allowed: accessories hang off the edge.
function grumpyRingCells(inner, outer, filter) {
  const cells = [];
  for (let y = -2; y < GRUMPY_PIXEL_DIM + 2; y++) {
    for (let x = -2; x < GRUMPY_PIXEL_DIM + 2; x++) {
      const d = Math.hypot(x - GRUMPY_CENTER, y - GRUMPY_CENTER);
      if (d >= inner && d <= outer && (!filter || filter(x, y))) cells.push({ x, y });
    }
  }
  return cells;
}

const GRUMPY_BODY = grumpyRingCells(0, 3.4);
const GRUMPY_RIM = grumpyRingCells(2.6, 3.4);
const GRUMPY_EYES = [{ x: 2, y: 2 }, { x: 4, y: 2 }];

// The mouth is the only part that changes when they cheer up: corners down for a frown, corners up for a smile.
const GRUMPY_FROWN = [{ x: 2, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 5 }];
const GRUMPY_SMILE = [{ x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 4 }];

const GRUMPY_SAD_COLORS = { body: "#8a8a8a", rim: "#616161" };
const GRUMPY_HAPPY_COLORS = { body: "#ffd700", rim: "#d1a300" };

const HEADPHONE_BAND = grumpyRingCells(3.7, 4.6, (x, y) => y <= GRUMPY_CENTER);
const HEADPHONE_CUPS = [-1, 7].flatMap(x => [2, 3, 4].map(y => ({ x, y })));
const HEADPHONE_PADS = [0, 6].map(x => ({ x, y: 3 }));

// Eight spikes of two blocks each. They change the silhouette rather than adding detail inside it, so a no-hug
// grumpy is still pickable out of a moving queue.
const GRUMPY_THORNS = Array.from({ length: 8 }, (unused, i) => (i / 8) * Math.PI * 2)
  .flatMap(angle => [3.7, 4.7].map(r => ({
    x: Math.round(GRUMPY_CENTER + Math.cos(angle) * r),
    y: Math.round(GRUMPY_CENTER + Math.sin(angle) * r)
  })));

const GRUMPY_MASK = [1, 2, 3, 4, 5].flatMap(x => [4, 5].map(y => ({ x, y })));
const GRUMPY_MASK_PLEAT = [1, 2, 3, 4, 5].map(x => ({ x, y: 4 }));
const GRUMPY_MASK_STRAPS = [{ x: 0, y: 4 }, { x: 6, y: 4 }];

function drawGrumpyCells(ctx, grumpy, cells, color) {
  const block = PLAYFIELD_PIXEL_BLOCK * (grumpy.scale || 1);
  const originX = grumpy.x - (GRUMPY_PIXEL_DIM * block) / 2;
  const originY = grumpy.y - (GRUMPY_PIXEL_DIM * block) / 2;

  ctx.fillStyle = color;
  cells.forEach(cell => {
    const left = Math.round(originX + cell.x * block);
    const top = Math.round(originY + cell.y * block);
    const right = Math.round(originX + (cell.x + 1) * block);
    const bottom = Math.round(originY + (cell.y + 1) * block);
    ctx.fillRect(left, top, right - left, bottom - top);
  });
}

function drawGrumpySprite(ctx, grumpy, showHealthBar = true) {
  const scale = grumpy.scale || 1;
  const radius = GRUMPY_RADIUS * scale;
  const mood = grumpy.isHappy ? GRUMPY_HAPPY_COLORS : GRUMPY_SAD_COLORS;

  drawGrumpyCells(ctx, grumpy, GRUMPY_BODY, mood.body);
  drawGrumpyCells(ctx, grumpy, GRUMPY_RIM, mood.rim);
  drawGrumpyCells(ctx, grumpy, GRUMPY_EYES, "#111");
  drawGrumpyCells(ctx, grumpy, grumpy.isHappy ? GRUMPY_SMILE : GRUMPY_FROWN, "#111");

  if (showHealthBar) {
    const barWidth = GRUMPY_RADIUS * 2 * scale;
    const barY = grumpy.y - (GRUMPY_RADIUS + 8) * scale;

    ctx.fillStyle='red';
    ctx.fillRect(grumpy.x - radius, barY, barWidth, 3 * scale);

    ctx.fillStyle='lime';
    ctx.fillRect(grumpy.x - radius, barY, barWidth*(1-grumpy.sad/grumpy.maxSad), 3 * scale);
  }

  // The band rides outside the head at every scale, which is what the old arc version kept getting wrong on
  // Headphone Hank: it sat 4px inside his larger skull with the earcups not reaching his edge.
  if (grumpy.hasHeadphones) {
    drawGrumpyCells(ctx, grumpy, HEADPHONE_BAND, "#b28ae6");
    drawGrumpyCells(ctx, grumpy, HEADPHONE_CUPS, "#5c2d91");
    drawGrumpyCells(ctx, grumpy, HEADPHONE_PADS, "#8750c7");
  }

  if (grumpy.hasDogAllergy) {
    drawGrumpyCells(ctx, grumpy, GRUMPY_MASK, "#f5f7fa");
    drawGrumpyCells(ctx, grumpy, GRUMPY_MASK_PLEAT, "#d9dee5");
    drawGrumpyCells(ctx, grumpy, GRUMPY_MASK_STRAPS, "#b8c2cc");
  }

  // Thorns drop away once they cheer up: nothing is left to warn the player
  // about, and softening as they head for the Happy Hangout is the whole point
  // of the game.
  if (grumpy.avoidsHugs && !grumpy.isHappy) {
    drawGrumpyCells(ctx, grumpy, GRUMPY_THORNS, "#5f7180");
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
  const rawRoundBonus = getRawRoundSadBonus(state.currentRound);
  const normalSad = NORMAL_BASE_SAD + getRoundSadBonus(state.currentRound);
  // A boss grows by exactly as much as a normal grumpy of its round grew, so it keeps the same standing against the
  // wave it headlines on every challenge level. Scaling its flat base by the multiplier instead would outpace that
  // wave, because a boss meter is nearly all base where a minion's is nearly all round bonus: Headphone Hank would
  // go from 10x a round-5 grumpy on Casual to 23x on Expert Hugger.
  const maxSad = isBoss
    ? Math.round(((options.bossHp || 1000) + rawRoundBonus) * normalSad / (NORMAL_BASE_SAD + rawRoundBonus))
      * hpMultiplier
    : normalSad * hpMultiplier * stressEaterMultiplier;
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
          state.careCredits += 5;
          textBubbles.push({
          text: "+5 ❤️",
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
        // Running out of path is not the same as arriving. A Stress Eater whose cookie another one reached
        // first, or anyone whose route was rebuilt under them, still has somewhere to be - charging a missed
        // heart there took hearts for grumpies standing halfway across town. Only the exit cell counts.
        const cell = getCell(this.x, this.y);
        const atExit = cell.cx === END.x && cell.cy === END.y;

        if (!atExit) {
          if (this.isStressEater) {
            this.targetCookie = null;
            retargetStressEater(this);
          } else {
            const path = findPath({ x: cell.cx, y: cell.cy }, END);
            if (path) {
              this.path = path;
              this.pathIndex = 0;
            }
          }
        }

        // Whoever is still out of path has nowhere left to go, so the round can never resolve while they stand
        // there. That does count, which keeps a genuinely stuck grumpy from hanging the round.
        if (atExit || this.pathIndex >= this.path.length) {
          this.reachedEnd=true;
          this.active=false;
          if (this.sad > 0) {
            state.escapedSad += this.isBoss ? 5 : 1;
          }
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
const MUSIC_FADE = 0.5;         // seconds to fade out and back in

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
let musicTune = null;           // what is sounding right now
let musicWanted = null;         // what the current game mode asks for
let musicSwitchAt = 0;          // when the fade-out finishes and we swap
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
// Tried once at load so the title tune starts on its own where the browser
// allows it, and again from pointerdown for the browsers that insist on a
// gesture. The catch matters: an unhandled rejection would log an error, and
// the competition requires a clean console.
function startAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(audioCtx.destination);
    musicNext = audioCtx.currentTime;
  }
  if (audioCtx.state !== "running") {
    const resumed = audioCtx.resume();
    if (resumed && resumed.catch) resumed.catch(() => {});
  }
}

// Ramp rather than jump, so starting and stopping never clicks.
function musicFadeTo(level) {
  if (!musicGain) return;
  const now = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(level, now + MUSIC_FADE);
}

function setMusicOn(on) {
  musicOn = on;
  musicFadeTo(on && musicTune ? MUSIC_VOLUME : 0);
  try { localStorage.setItem("ktd:music", on ? "1" : "0"); } catch (e) {}
}

// Title tune on the menu, round tune while a wave runs, silence everywhere
// else - so the music stops for the round popup and starts the next wave from
// the top of the loop rather than resuming mid-phrase.
function updateMusic() {
  const wanted =
    state.gameMode === "menu" ? TITLE_TUNE :
    state.gameMode === "playing" ? ROUND_TUNE : null;

  if (wanted !== musicWanted) {
    musicWanted = wanted;

    if (audioCtx && musicTune) {
      // Something is sounding, so fade it out first and swap when it is gone.
      musicFadeTo(0);
      musicSwitchAt = audioCtx.currentTime + MUSIC_FADE;
    } else {
      // Nothing playing, so adopt straight away and fade up.
      musicTune = wanted;
      musicStep = 0;
      if (audioCtx) {
        musicNext = audioCtx.currentTime;
        musicFadeTo(musicOn && wanted ? MUSIC_VOLUME : 0);
      }
    }
  }

  if (!audioCtx || audioCtx.state !== "running") return;

  // Fade-out finished: take up the new tune from the top of its loop.
  if (musicSwitchAt && audioCtx.currentTime >= musicSwitchAt) {
    musicSwitchAt = 0;
    musicTune = musicWanted;
    musicStep = 0;
    musicNext = audioCtx.currentTime;
    musicFadeTo(musicOn && musicTune ? MUSIC_VOLUME : 0);
  }

  if (!musicTune) return;

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

// Tied eighth notes. When muted the notes dim and a white slash crosses them,
// backed by a dark stroke so it stays visible over both the notes and the sky.
function drawMusicToggle(ctx, box) {
  const x = box.x;
  const y = box.y;

  ctx.fillStyle = "rgba(7, 16, 28, 0.45)";
  ctx.fillRect(x, y, box.w, box.h);

  const ink = musicOn ? "#ffffff" : "#b9c8e2";
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;

  ctx.beginPath();
  ctx.ellipse(x + 10, y + 26, 4.5, 3.4, -0.35, 0, Math.PI * 2);
  ctx.ellipse(x + 24, y + 23, 4.5, 3.4, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 25.5);
  ctx.lineTo(x + 14, y + 9);
  ctx.moveTo(x + 28, y + 22.5);
  ctx.lineTo(x + 28, y + 6);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 9.5);
  ctx.lineTo(x + 28, y + 6.5);
  ctx.stroke();

  if (!musicOn) {
    ctx.strokeStyle = "#0b1630";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 31);
    ctx.lineTo(x + 31, y + 5);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

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
const UNICORN_SEEK_RANGE = 300;       // how far from her cell she looks for a grumpy

// She is the only buddy who levels up, and the upgrades stack: level 2 buys speed, level 3 buys strength on top
// of it. Her coat colour changes with the level so the player can read how trained she is from across the field.
const UNICORN_LEVELS = [
  // orbitSpeed: radians/sec  flySpeed: px/sec  relief: sad meter per second from the rainbow
  // The upgrades alternate: odd levels buy speed, even levels buy strength, and each one keeps everything the
  // level below it bought.
  { orbitSpeed: 2.6, flySpeed: 170, relief: 22, upgradeCost: 190, upgradeLabel: "Faster" },
  { orbitSpeed: 4.2, flySpeed: 240, relief: 22, upgradeCost: 240, upgradeLabel: "Stronger" },
  { orbitSpeed: 4.2, flySpeed: 240, relief: 40, upgradeCost: 300, upgradeLabel: "Faster" },
  { orbitSpeed: 5.6, flySpeed: 310, relief: 40, upgradeCost: 380, upgradeLabel: "Stronger" },
  { orbitSpeed: 5.6, flySpeed: 310, relief: 62, upgradeCost: 0,   upgradeLabel: "" }
];
const UNICORN_MAX_LEVEL = UNICORN_LEVELS.length;
const UNICORN_RING_COLORS = [
  "rgba(185,140,255,0.35)", "rgba(255,141,194,0.6)", "rgba(160,92,255,0.8)",
  "rgba(77,195,255,0.8)", "rgba(255,217,61,0.85)"
];
const RAINBOW_TOUCH_RADIUS = 16;
const RAINBOW_LIFE = 1.1;             // seconds a rainbow segment lingers
const ADVANCED_RAINBOW_MULTIPLIER = 3;
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
  // isHugged is rebuilt from scratch every frame. Leaving it set was what froze a grumpy in place forever once
  // his Hugger stopped holding him: nothing but cheering up ever cleared it, so Negative Neil could sour the
  // Hugger mid-hug and then stand there held by a buddy that was no longer working. The flag blocks all movement,
  // so it looked like any disabled buddy nearby was pinning him.
  state.grumpies.forEach(g => { g.isHugged = false; });

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

function cheerUpWithRainbow(grumpy, dt, relief) {
  grumpy.sad -= relief * dt;
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

    const stats = UNICORN_LEVELS[u.level - 1];

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

    u.angle += stats.orbitSpeed * dt;

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
      const step = Math.min(stats.flySpeed * dt, distance);
      u.x += (dx / distance) * step;
      u.y += (dy / distance) * step;
    }

    u.dropTimer -= dt;
    if (u.dropTimer <= 0) {
      u.dropTimer = RAINBOW_DROP_INTERVAL;
      u.colorIndex = (u.colorIndex + 1) % RAINBOW_COLORS.length;

      // Segments carry their own lifespan so the fade still reads right when Advanced Mode stretches it.
      const life = RAINBOW_LIFE * (state.advancedMode ? ADVANCED_RAINBOW_MULTIPLIER : 1);
      rainbowTrail.push({
        x: u.x,
        y: u.y,
        c: RAINBOW_COLORS[u.colorIndex],
        life,
        maxLife: life,
        relief: stats.relief
      });
    }

    // The grumpy she is circling sits inside the loop, so the trail itself
    // sweeps around them rather than over them. She tends to them directly
    // instead of waiting for the rainbow to catch them by accident.
    if (u.target && !helped.has(u.target)) {
      helped.add(u.target);
      cheerUpWithRainbow(u.target, dt, stats.relief);
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

    // Segments carry the strength HappyHorn had when she painted them, and the strongest one a grumpy is
    // standing in wins. Adding them up would make relief depend on how densely the trail happens to be drawn.
    let relief = 0;
    rainbowTrail.forEach(segment => {
      if (segment.relief <= relief) return;
      if (Math.hypot(grumpy.x - segment.x, grumpy.y - segment.y) < RAINBOW_TOUCH_RADIUS) relief = segment.relief;
    });

    if (!relief) return;

    cheerUpWithRainbow(grumpy, dt, relief);
  });
}

// He used to sour anything within 90px, taking a full 5 seconds about it, which
// meant he mostly drifted past doing nothing. Now it is contact range and half
// a second, so walking him into your crew wrecks it - and placement off his
// route is the counter-play.
const NEIL_TOUCH_RANGE = 68;      // roughly a cell and a half: close by, not only touching
const NEIL_DISABLE_TIME = 0.5;    // seconds of contact to sour a buddy
const NEIL_RECOVER_TIME = 2;      // seconds to shake it off once he has moved on

function applyNegativeNeil(dt) {
  state.grumpies.forEach(grumpy => {
    if (!grumpy.active || grumpy.isHappy || grumpy.name !== "Negative Neil") return;

    forEachBuddy((buddy, kind) => {
      // Happy Horn is the one he cannot sour. Without this she is actively bad against him: she orbits her
      // target at 34px, inside his souring range, so she would fly in and be disabled within seconds.
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

// Clicking a HappyHorn already on the field opens her training button. Only one of the two popups is ever open,
// so building and upgrading never fight over the same click.
const upgradeMenu = { unicorn: null };

function closePopupMenus() {
  placementMenu.active = false;
  upgradeMenu.unicorn = null;
}

// Her own tile never did anything before - it is blocked, so the build menu refuses it - and she is usually off
// circling a grumpy, so both the tile and wherever she has flown to count as clicking her.
function getUnicornAt(x, y, cx, cy) {
  return unicorns.find(u =>
    Math.hypot(x - u.x, y - u.y) < 22 ||
    (cx === Math.floor(u.homeX / GRID_SIZE) && cy === Math.floor(u.homeY / GRID_SIZE))
  ) || null;
}

function canUpgradeUnicorn(u) {
  return u.level < UNICORN_MAX_LEVEL &&
    state.careCredits >= UNICORN_LEVELS[u.level - 1].upgradeCost;
}

function upgradeUnicorn(u) {
  state.careCredits -= UNICORN_LEVELS[u.level - 1].upgradeCost;
  u.level++;
  upgradeMenu.unicorn = null;
}

// Anchored to her home cell rather than to her sprite, so the button does not fly away mid-click.
function getUnicornUpgradeButton(u) {
  const w = prefersCoarsePointer ? 160 : 136;
  const h = prefersCoarsePointer ? 40 : 28;
  const gapFromCell = GRID_SIZE / 2 + BUILD_MENU_GAP;
  const fitsOnRight = u.homeX + gapFromCell + w + 4 <= canvas.width;

  return {
    x: clamp(fitsOnRight ? u.homeX + gapFromCell : u.homeX - gapFromCell - w, 4, canvas.width - w - 4),
    y: clamp(u.homeY - h / 2, BUILD_MENU_TOP, canvas.height - h - 4),
    w,
    h
  };
}

function drawPopupButton(ctx, rect, label, enabled) {
  ctx.fillStyle = "#243b55";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = enabled ? "#ffffff" : "#8a8a8a";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function getUnicornUpgradeLabel(u) {
  // The button hangs off her own tile, so repeating her name here only made the label outgrow the button.
  if (u.level >= UNICORN_MAX_LEVEL) return `Lv${u.level} - Fully Trained`;
  const next = UNICORN_LEVELS[u.level - 1];
  return `Lv${u.level + 1} ${next.upgradeLabel} (${next.upgradeCost})`;
}

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
  closePopupMenus();
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

    if (pointInRect(x, y, musicToggleButton)) {
      setMusicOn(!musicOn);
      return;
    }

    if (pointInRect(x, y, difficultyButton)) {
      setDifficulty((state.difficulty + 1) % DIFFICULTIES.length);
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
    closePopupMenus();
    if(click) state.gameMode="menu";
    return;
  }

  if (click && pointInRect(x, y, pauseButton)) {
    closePopupMenus();
    state.pausedFromRound = state.currentRound;
    state.gameMode = "paused";
    return;
  }

  mouse.x=x; mouse.y=y;
  const {cx,cy}=getCell(x,y);

  if (upgradeMenu.unicorn) {
    if (pointInRect(x, y, getUnicornUpgradeButton(upgradeMenu.unicorn))) {
      if (click && canUpgradeUnicorn(upgradeMenu.unicorn)) upgradeUnicorn(upgradeMenu.unicorn);
      return;
    }
    if (!click) return;
    upgradeMenu.unicorn = null;
  }

  if (click) {
    const clicked = getUnicornAt(x, y, cx, cy);
    if (clicked) {
      placementMenu.active = false;
      upgradeMenu.unicorn = clicked;
      return;
    }
  }

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
    level: 1,
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

// Any interaction anywhere unlocks audio, not just a tap on the playfield - the
// Full Screen button and the number-key shortcuts count too. startAudio() is
// idempotent, so re-firing costs nothing.
addEventListener("pointerdown", startAudio, { passive: true });
addEventListener("keydown", startAudio, { passive: true });

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
    const fade = segment.life / segment.maxLife;

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

  return currentY + lineHeight;
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
    ctx.textBaseline="alphabetic";
    ctx.fillText("Help grumpies feel better",canvas.width/2,138);

    const difficulty = DIFFICULTIES[state.difficulty];
    const heartWidth = HEART_COLS * difficulty.heart;
    const heartHeight = HEART_ROWS.length * difficulty.heart;

    ctx.fillStyle="#16324f";
    ctx.fillRect(difficultyButton.x, difficultyButton.y, difficultyButton.w, difficultyButton.h);
    ctx.strokeStyle="rgba(255,255,255,0.45)";
    ctx.lineWidth=2;
    ctx.strokeRect(difficultyButton.x, difficultyButton.y, difficultyButton.w, difficultyButton.h);

    // The heart is centred on the button's height, so the Expert one outgrows the frame and spills over it.
    drawPixelArt(
      ctx,
      difficultyButton.x + difficultyButton.w - heartWidth - 14,
      difficultyButton.y + (difficultyButton.h - heartHeight) / 2,
      HEART_PIXELS,
      difficulty.heart
    );

    ctx.fillStyle="white";
    ctx.font="15px sans-serif";
    ctx.textBaseline="middle";
    ctx.textAlign="left";
    ctx.fillText(
      `Challenge level: ${difficulty.label}`,
      difficultyButton.x + 16,
      difficultyButton.y + difficultyButton.h / 2 + 1
    );
    ctx.textAlign="center";

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

    drawMusicToggle(ctx, musicToggleButton);

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
        "This game was made by EricOP with his kids Asa and Thea. Codex and Claude were our hard-working robotic partners.",
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
    const bodyBottom = wrapText(
      ctx,
      page.body,
      canvas.width / 2,
      112,
      560,
      26
    );

    // The icon hangs off the bottom of the copy rather than off a fixed y, so a long body pushes it down instead
    // of being drawn over. The floor keeps short pages looking the way they always did, and the sprite is centred
    // on its own half-height so it does not creep under the page counter.
    // A boss draws its name above its head, so it needs roughly a line more clearance over the sprite than a
    // buddy or a plain grumpy does.
    const iconTopGap = page.icon && page.icon.isBoss ? 42 : 18;
    const iconCenterY = Math.min(234, Math.max(214, bodyBottom + iconTopGap));

    if (page.buddyIcon) {
      drawBuddySpriteCentered(
        ctx,
        canvas.width / 2,
        iconCenterY,
        buddyPixelArt[page.buddyIcon],
        PLAYFIELD_PIXEL_BLOCK,
        0,
        2,
        0.008
      );
    }

    if (page.icon) {
      drawGrumpySprite(
        ctx,
        {
          x: canvas.width / 2,
          y: iconCenterY,
          sad: page.icon.isBoss ? (page.icon.bossHp || 1000) : NORMAL_BASE_SAD,
          maxSad: page.icon.isBoss ? (page.icon.bossHp || 1000) : NORMAL_BASE_SAD,
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
    drawBuddySpriteCentered(ctx, t.x, t.y, buddyPixelArt.hug, PLAYFIELD_PIXEL_BLOCK, i*0.5, 2, 0.006);
    if (t.isGrumpy) drawBuddyGrumpiness(ctx, t);
  });

  // therapyDogs.forEach(d=>{
  //   ctx.fillStyle='orange';
  //   ctx.beginPath();
  //   ctx.arc(d.x,d.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  therapyDogs.forEach((d,i)=>{
    drawBuddySpriteCentered(ctx, d.x, d.y, buddyPixelArt.dog, PLAYFIELD_PIXEL_BLOCK, i*0.3, 1.5, 0.007);
    if (d.isGrumpy) drawBuddyGrumpiness(ctx, d);
  });

  // affirmBuddies.forEach(t=>{
  //   ctx.fillStyle='purple';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  affirmBuddies.forEach((t,i)=>{
    drawBuddySpriteCentered(ctx, t.x, t.y, buddyPixelArt.affirm, PLAYFIELD_PIXEL_BLOCK, i*0.2, 1.8, 0.008);
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

    drawBuddySpriteCentered(ctx, t.x, t.y, buddyPixelArt.radio, PLAYFIELD_PIXEL_BLOCK, i*0.4, 2.5, 0.005);
    if (t.isGrumpy) drawBuddyGrumpiness(ctx, t);
  });

  unicorns.forEach((u,i)=>{
    // Mark her home cell faintly so the player can still see the tile she
    // occupies while she is off circling a grumpy.
    ctx.strokeStyle = UNICORN_RING_COLORS[u.level - 1];
    ctx.lineWidth = 2;
    ctx.strokeRect(u.homeX - 18, u.homeY - 18, 36, 36);

    drawBuddySpriteCentered(ctx, u.x, u.y, unicornArtByLevel[u.level - 1], PLAYFIELD_PIXEL_BLOCK, i*0.6, 2.5, 0.009);

    // The coat colour already says how trained she is; the badge on her tile says it in words, and only once she
    // has actually been trained.
    if (u.level > 1) {
      ctx.fillStyle = UNICORN_RING_COLORS[u.level - 1];
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`Lv${u.level}`, u.homeX, u.homeY + 26);
    }

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
  if (state.difficulty) {
    ctx.fillText(DIFFICULTIES[state.difficulty].name, 10, state.advancedMode ? 100 : 80);
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
    getPlacementMenuButtons(placementMenu.cx, placementMenu.cy).forEach(button => {
      const cost = buddyCosts[button.buddyType];
      drawPopupButton(ctx, button, `${button.label} (${cost || "Free"})`, canPlaceBuddy(button.buddyType));
    });
  }

  if (upgradeMenu.unicorn) {
    const u = upgradeMenu.unicorn;
    drawPopupButton(ctx, getUnicornUpgradeButton(u), getUnicornUpgradeLabel(u), canUpgradeUnicorn(u));
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

startAudio();
requestAnimationFrame(loop);
