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
const ROUND_SPAWN_INCREASE = 10;
const HEADPHONE_GRUMPY_INTERVAL = 6;
const DOG_ALLERGY_GRUMPY_INTERVAL = 6;
const DOG_ALLERGY_GRUMPY_OFFSET = 2;
const NO_HUG_GRUMPY_INTERVAL = 6;
const NO_HUG_GRUMPY_OFFSET = 4;
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
  y: 196,
  w: 220,
  h: 42
};
const pauseMenuButton = {
  x: canvas.width / 2 - 110,
  y: 248,
  w: 220,
  h: 42
};

function getRoundSpawnCount(roundNumber) {
  return BASE_ROUND_SPAWN + (roundNumber - 1) * ROUND_SPAWN_INCREASE;
}

function getSpawnDelayForRound(roundNumber) {
  return BASE_SPAWN_DELAY * Math.pow(ROUND_SPAWN_SPEEDUP, roundNumber - 1);
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  );
}

function doesCellOverlapRect(cx, cy, rect) {
  const cellLeft = cx * GRID_SIZE;
  const cellTop = cy * GRID_SIZE;
  const cellRight = cellLeft + GRID_SIZE;
  const cellBottom = cellTop + GRID_SIZE;

  return (
    cellLeft < rect.x + rect.width &&
    cellRight > rect.x &&
    cellTop < rect.y + rect.height &&
    cellBottom > rect.y
  );
}

function getInstructionPages(roundNumber) {
  if (roundNumber === 1) {
    return [
      {
        title: "Round 1",
        body: "This game is all about kindness and spreading love to people who have grumpy hearts, so they can go hang out in the Happy Hangout. Build towers to do this."
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
        body: "Some grumpies are allergic to therapy dogs. Their mask icon means TherapyDog towers will skip them, so use your other kindness towers instead.",
        icon: { hasHeadphones: false, hasDogAllergy: true }
      }
    ];
  }

  if (roundNumber === 4) {
    return [
      {
        title: "Round 4",
        body: "Some grumpies do not like hugs. Their crossed-arms icon means Hugger towers will leave them alone, so use words, radio, or dogs to help them instead.",
        icon: { hasHeadphones: false, hasDogAllergy: false, avoidsHugs: true }
      }
    ];
  }

  if (roundNumber === 5) {
    return [
      {
        title: "Round 5 Boss Fight",
        body: "A huge headphone grumpy is stomping in. Headphone Hank tunes out Affirming Words and Glad Radio, has a massive grumpy heart, but he is still partial to pets, so TherapyDog towers can help.",
        icon: { isBoss: true, hasHeadphones: true, bossName: "Headphone Hank", bossHp: 1500 }
      }
    ];
  }

  if (roundNumber === 10) {
    return [
      {
        title: "Round 10 Boss Fight",
        body: "Negative Neil is the gloomiest grump in town. He lumbers in bigger than everyone else and slowly turns nearby towers grumpy, so protect your kindness crew while you cheer him up.",
        icon: { isBoss: true, bossName: "Negative Neil", bossHp: 1000 }
      }
    ];
  }

  return [];
}

function beginRoundFlow(roundNumber) {
  const pages = getInstructionPages(roundNumber);

  if (pages.length) {
    state.pendingRound = roundNumber;
    state.instructionPages = pages;
    state.instructionPageIndex = 0;
    state.gameMode = "instructions";
    placementMenu.active = false;
    return;
  }

  startRound(roundNumber);
  state.gameMode = "playing";
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

function resetTowerTargets() {
  hugTowers.forEach(tower => {
    tower.target = null;
  });

  therapyDogs.forEach(tower => {
    tower.targets = [];
  });

  affirmTowers.forEach(tower => {
    tower.target = null;
  });
}

function forEachTower(callback) {
  hugTowers.forEach(tower => callback(tower, "hug"));
  therapyDogs.forEach(tower => callback(tower, "dog"));
  affirmTowers.forEach(tower => callback(tower, "affirm"));
  radioTowers.forEach(tower => callback(tower, "radio"));
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
      index % NO_HUG_GRUMPY_INTERVAL === NO_HUG_GRUMPY_OFFSET
  });
  g.path = findPath(START, END) || [];
  return g;
}

function startRound(roundNumber) {
  state.currentRound = roundNumber;
  state.grumpies = [];
  state.happyCount = 0;
  state.totalSpawned = getRoundSpawnCount(roundNumber);
  state.waveTextTimer = 2.5;
  placementMenu.active = false;
  textBubbles.length = 0;
  resetTowerTargets();

  if (roundNumber === 5) {
    const minionCount = 50;
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
    const minionCount = 50;
    state.totalSpawned = minionCount + 1;
    const spawnDelay = getSpawnDelayForRound(roundNumber);
    const boss = createGrumpy(0, {
      isBoss: true,
      bossName: "Negative Neil",
      bossHp: 1000
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

const towerCosts = {
  hug: 30,
  dog: 80,
  affirm: 20,
  radio: 50
};

const buildMenuButtons = [
  { label: "Hugger", towerType: "hug", direction: "up" },
  { label: "TherapyDog", towerType: "dog", direction: "right" },
  { label: "AffirmingWords", towerType: "affirm", direction: "down" },
  { label: "GladRadio", towerType: "radio", direction: "left" }
];
const TOWER_PIXEL_DIM = 8;

// =========================
// PIXEL ART DEFINITIONS
// Each object in the array represents a "pixel block".
// x/y = position in mini grid, c = color
// Comments explain what part of the tower it is
// =========================

const towerPixelArt = {
  hug: [
    { x: 2, y: 0, c: "#ff7faa" }, { x: 5, y: 0, c: "#ff7faa" },
    { x: 1, y: 1, c: "#ff7faa" }, { x: 2, y: 1, c: "#ffb3c8" }, { x: 3, y: 1, c: "#ff7faa" }, { x: 4, y: 1, c: "#ff7faa" }, { x: 5, y: 1, c: "#ffb3c8" }, { x: 6, y: 1, c: "#ff7faa" },
    { x: 0, y: 2, c: "#ffd7a3" }, { x: 1, y: 2, c: "#ff7faa" }, { x: 2, y: 2, c: "#ff7faa" }, { x: 3, y: 2, c: "#ff7faa" }, { x: 4, y: 2, c: "#ff7faa" }, { x: 5, y: 2, c: "#ff7faa" }, { x: 6, y: 2, c: "#ff7faa" }, { x: 7, y: 2, c: "#ffd7a3" },
    { x: 1, y: 3, c: "#ff7faa" }, { x: 2, y: 3, c: "#2f1b2d" }, { x: 3, y: 3, c: "#ffb3c8" }, { x: 4, y: 3, c: "#ffb3c8" }, { x: 5, y: 3, c: "#2f1b2d" }, { x: 6, y: 3, c: "#ff7faa" },
    { x: 2, y: 4, c: "#ff7faa" }, { x: 3, y: 4, c: "#2f1b2d" }, { x: 4, y: 4, c: "#2f1b2d" }, { x: 5, y: 4, c: "#ff7faa" },
    { x: 2, y: 5, c: "#ff7faa" }, { x: 3, y: 5, c: "#ff7faa" }, { x: 4, y: 5, c: "#ff7faa" }, { x: 5, y: 5, c: "#ff7faa" },
    { x: 3, y: 6, c: "#ff7faa" }, { x: 4, y: 6, c: "#ff7faa" },
    { x: 3, y: 7, c: "#ff7faa" }, { x: 4, y: 7, c: "#ff7faa" }
  ],

  dog: [
    { x: 1, y: 0, c: "#8f5a2a" }, { x: 6, y: 0, c: "#8f5a2a" },
    { x: 0, y: 1, c: "#8f5a2a" }, { x: 1, y: 1, c: "#8f5a2a" }, { x: 2, y: 1, c: "#f4c78a" }, { x: 3, y: 1, c: "#f4c78a" }, { x: 4, y: 1, c: "#f4c78a" }, { x: 5, y: 1, c: "#f4c78a" }, { x: 6, y: 1, c: "#8f5a2a" }, { x: 7, y: 1, c: "#8f5a2a" },
    { x: 1, y: 2, c: "#8f5a2a" }, { x: 2, y: 2, c: "#f4c78a" }, { x: 3, y: 2, c: "#f8ddb4" }, { x: 4, y: 2, c: "#f8ddb4" }, { x: 5, y: 2, c: "#f4c78a" }, { x: 6, y: 2, c: "#8f5a2a" },
    { x: 1, y: 3, c: "#f4c78a" }, { x: 2, y: 3, c: "#f4c78a" }, { x: 3, y: 3, c: "#111111" }, { x: 4, y: 3, c: "#111111" }, { x: 5, y: 3, c: "#f4c78a" }, { x: 6, y: 3, c: "#f4c78a" },
    { x: 2, y: 4, c: "#d99b58" }, { x: 3, y: 4, c: "#f6e4d4" }, { x: 4, y: 4, c: "#f6e4d4" }, { x: 5, y: 4, c: "#d99b58" },
    { x: 2, y: 5, c: "#d99b58" }, { x: 3, y: 5, c: "#2b1f1a" }, { x: 4, y: 5, c: "#2b1f1a" }, { x: 5, y: 5, c: "#d99b58" },
    { x: 2, y: 6, c: "#8f5a2a" }, { x: 3, y: 6, c: "#d99b58" }, { x: 4, y: 6, c: "#d99b58" }, { x: 5, y: 6, c: "#8f5a2a" },
    { x: 2, y: 7, c: "#c83c4a" }, { x: 3, y: 7, c: "#e14f5d" }, { x: 4, y: 7, c: "#e14f5d" }, { x: 5, y: 7, c: "#c83c4a" }
  ],

  affirm: [
    { x: 4, y: 1, c: "#ffffff" },
    { x: 3, y: 2, c: "#e3e3e3" }, { x: 4, y: 2, c: "#ffffff" }, { x: 5, y: 2, c: "#ffffff" },
    { x: 2, y: 3, c: "#d0d0d0" }, { x: 3, y: 3, c: "#ffffff" }, { x: 4, y: 3, c: "#ffffff" }, { x: 5, y: 3, c: "#ffffff" }, { x: 6, y: 3, c: "#ffffff" },
    { x: 1, y: 4, c: "#c8c8c8" }, { x: 2, y: 4, c: "#ffffff" }, { x: 3, y: 4, c: "#ffffff" }, { x: 4, y: 4, c: "#ffffff" }, { x: 5, y: 4, c: "#ffffff" }, { x: 6, y: 4, c: "#ffffff" }, { x: 7, y: 4, c: "#c8c8c8" },
    { x: 1, y: 5, c: "#c8c8c8" }, { x: 2, y: 5, c: "#ffffff" }, { x: 3, y: 5, c: "#ffffff" }, { x: 4, y: 5, c: "#ffffff" }, { x: 5, y: 5, c: "#ffffff" }, { x: 6, y: 5, c: "#ffffff" }, { x: 7, y: 5, c: "#c8c8c8" },
    { x: 3, y: 6, c: "#8a8a8a" }, { x: 4, y: 6, c: "#ffffff" }, { x: 5, y: 6, c: "#8a8a8a" },
    { x: 4, y: 7, c: "#8a8a8a" }, { x: 5, y: 7, c: "#8a8a8a" }
  ],

  radio: [
    { x: 2, y: 0, c: "#2f2f35" }, { x: 3, y: 0, c: "#2f2f35" }, { x: 4, y: 0, c: "#2f2f35" }, { x: 5, y: 0, c: "#2f2f35" },
    { x: 1, y: 1, c: "#1f1f24" }, { x: 2, y: 1, c: "#2f2f35" }, { x: 3, y: 1, c: "#2f2f35" }, { x: 4, y: 1, c: "#2f2f35" }, { x: 5, y: 1, c: "#2f2f35" }, { x: 6, y: 1, c: "#1f1f24" },
    { x: 0, y: 2, c: "#18181c" }, { x: 1, y: 2, c: "#4a4a54" }, { x: 2, y: 2, c: "#ededf2" }, { x: 3, y: 2, c: "#bfc4d6" }, { x: 4, y: 2, c: "#bfc4d6" }, { x: 5, y: 2, c: "#ededf2" }, { x: 6, y: 2, c: "#4a4a54" }, { x: 7, y: 2, c: "#18181c" },
    { x: 0, y: 3, c: "#18181c" }, { x: 1, y: 3, c: "#585865" }, { x: 2, y: 3, c: "#23232a" }, { x: 3, y: 3, c: "#23232a" }, { x: 4, y: 3, c: "#23232a" }, { x: 5, y: 3, c: "#23232a" }, { x: 6, y: 3, c: "#585865" }, { x: 7, y: 3, c: "#18181c" },
    { x: 0, y: 4, c: "#18181c" }, { x: 1, y: 4, c: "#585865" }, { x: 2, y: 4, c: "#6d6df0" }, { x: 3, y: 4, c: "#23232a" }, { x: 4, y: 4, c: "#23232a" }, { x: 5, y: 4, c: "#6d6df0" }, { x: 6, y: 4, c: "#585865" }, { x: 7, y: 4, c: "#18181c" },
    { x: 0, y: 5, c: "#18181c" }, { x: 1, y: 5, c: "#585865" }, { x: 2, y: 5, c: "#23232a" }, { x: 3, y: 5, c: "#57d8ff" }, { x: 4, y: 5, c: "#57d8ff" }, { x: 5, y: 5, c: "#23232a" }, { x: 6, y: 5, c: "#585865" }, { x: 7, y: 5, c: "#18181c" },
    { x: 0, y: 6, c: "#202028" }, { x: 1, y: 6, c: "#202028" }, { x: 2, y: 6, c: "#202028" }, { x: 3, y: 6, c: "#202028" }, { x: 4, y: 6, c: "#202028" }, { x: 5, y: 6, c: "#202028" }, { x: 6, y: 6, c: "#202028" }, { x: 7, y: 6, c: "#202028" },
    { x: 1, y: 7, c: "#18181c" }, { x: 2, y: 7, c: "#18181c" }, { x: 5, y: 7, c: "#18181c" }, { x: 6, y: 7, c: "#18181c" }
  ]
};

const menuGrumpies = [];

function ensureMenuGrumpies() {
  if (menuGrumpies.length) return;

  menuGrumpies.push(
    { x: 160, y: 250, vx: 18, vy: 7, hasHeadphones: false, hasDogAllergy: false },
    { x: 240, y: 295, vx: 14, vy: -6, hasHeadphones: true, hasDogAllergy: false },
    { x: 375, y: 260, vx: -16, vy: 5, hasHeadphones: false, hasDogAllergy: true, avoidsHugs: false },
    { x: 520, y: 300, vx: 15, vy: -5, hasHeadphones: true, hasDogAllergy: false, avoidsHugs: false },
    { x: 455, y: 315, vx: 13, vy: 4, hasHeadphones: false, hasDogAllergy: false, avoidsHugs: true },
    { x: 610, y: 248, vx: -17, vy: 6, hasHeadphones: false, hasDogAllergy: false }
  );
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

  if (grumpy.hasHeadphones) {
    ctx.strokeStyle = 'rgba(190, 120, 255, 0.65)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(grumpy.x, grumpy.y - 4, 11, Math.PI, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#5c2d91';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(grumpy.x, grumpy.y - 4, 8, Math.PI, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#8750c7';
    ctx.fillRect(grumpy.x - 14, grumpy.y - 2, 6, 8);
    ctx.fillRect(grumpy.x + 8, grumpy.y - 2, 6, 8);

    ctx.fillStyle = '#b28ae6';
    ctx.fillRect(grumpy.x - 13, grumpy.y, 2, 4);
    ctx.fillRect(grumpy.x + 11, grumpy.y, 2, 4);
  }

  if (grumpy.hasDogAllergy) {
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(grumpy.x - 6, grumpy.y + 1, 12, 5);

    ctx.fillStyle = '#d9dee5';
    ctx.fillRect(grumpy.x - 4, grumpy.y + 2, 8, 1);

    ctx.strokeStyle = '#b8c2cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(grumpy.x - 6, grumpy.y + 2);
    ctx.lineTo(grumpy.x - 10, grumpy.y + 1);
    ctx.moveTo(grumpy.x + 6, grumpy.y + 2);
    ctx.lineTo(grumpy.x + 10, grumpy.y + 1);
    ctx.stroke();
  }

  if (grumpy.avoidsHugs) {
    ctx.strokeStyle = '#c84d7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(grumpy.x - 9, grumpy.y + 1);
    ctx.lineTo(grumpy.x - 5, grumpy.y + 5);
    ctx.lineTo(grumpy.x + 2, grumpy.y + 8);
    ctx.moveTo(grumpy.x + 9, grumpy.y + 1);
    ctx.lineTo(grumpy.x + 5, grumpy.y + 5);
    ctx.lineTo(grumpy.x - 2, grumpy.y + 8);
    ctx.stroke();

    ctx.fillStyle = '#f0c2ad';
    ctx.fillRect(grumpy.x - 10, grumpy.y, 2, 2);
    ctx.fillRect(grumpy.x + 8, grumpy.y, 2, 2);
    ctx.fillRect(grumpy.x + 1, grumpy.y + 7, 2, 2);
    ctx.fillRect(grumpy.x - 3, grumpy.y + 7, 2, 2);
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
    ctx.fillText(grumpy.name, grumpy.x, grumpy.y - radius - 8);
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

  hugTowers.length = 0;
  therapyDogs.length = 0;
  affirmTowers.length = 0;
  radioTowers.length = 0;
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
  const hpMultiplier = state.advancedMode ? 2 : 1;
  const roundHpBonus = Math.max(0, state.currentRound - 1);
  const baseSad = isBoss ? (options.bossHp || 1000) : 100;
  const maxSad = (baseSad + roundHpBonus) * hpMultiplier;
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
    scale:isBoss ? 1.5 : 1,
    name:isBoss ? (options.bossName || "Negative Neil") : "",
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
// TOWERS
// =========================
const hugTowers=[];
const therapyDogs=[];
const affirmTowers=[];
const radioTowers=[];

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
  radioTowers.forEach(t=>{
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
  hugTowers.forEach(t=>{
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

const affirmations=[
  "you're great",
  "you can do it",
  "i love you",
  "keep going",
  "you're valued"
];
const textBubbles=[];

function applyAffirmations(dt){
  affirmTowers.forEach(t=>{
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

function applyNegativeNeil(dt) {
  state.grumpies.forEach(grumpy => {
    if (!grumpy.active || grumpy.isHappy || grumpy.name !== "Negative Neil") return;

    forEachTower(tower => {
      const distance = Math.hypot(grumpy.x - tower.x, grumpy.y - tower.y);

      if (distance < 90) {
        tower.grumpiness = Math.min(1, (tower.grumpiness || 0) + dt * 0.2);
      } else if (!tower.isGrumpy) {
        tower.grumpiness = Math.max(0, (tower.grumpiness || 0) - dt * 0.06);
      }

      tower.isGrumpy = (tower.grumpiness || 0) >= 1;
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
let selectedTower="hug";
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

  return buildMenuButtons.map(button => {
    let x = centerX - width / 2;
    let y = centerY - height / 2;

    if (button.direction === "up") y = centerY - GRID_SIZE - height - 4;
    if (button.direction === "down") y = centerY + GRID_SIZE + 4;
    if (button.direction === "left") x = centerX - GRID_SIZE - width - 4;
    if (button.direction === "right") x = centerX + GRID_SIZE + 4;

    return {
      ...button,
      x: clamp(x, 4, canvas.width - width - 4),
      y: clamp(y, 4, canvas.height - height - 4),
      w: width,
      h: height
    };
  });
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

  if (!isInsideGrid || isSpawnCell || isHappyHangoutCell || grid.blocked.has(key)) {
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
      if (click && state.careCredits >= towerCosts[menuButton.towerType]) {
        selectedTower = menuButton.towerType;
        placeTower(placementMenu.cx, placementMenu.cy, menuButton.towerType);
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

function placeTower(cx,cy,towerType=selectedTower){
  const cost=towerCosts[towerType];
  if(state.careCredits<cost) return;
  if (doesCellOverlapRect(cx, cy, HAPPY_HANGOUT)) return;

  state.careCredits-=cost;

  const x=cx*GRID_SIZE+20;
  const y=cy*GRID_SIZE+20;

  const baseTower = {
    x,
    y,
    grumpiness: 0,
    isGrumpy: false
  };

  if(towerType==="hug") hugTowers.push({...baseTower, range:52, target:null});
  if(towerType==="dog") therapyDogs.push({...baseTower, speed:60, range:120, targets:[]});
  if(towerType==="affirm") affirmTowers.push({...baseTower, range:140, target:null, cooldown:0});
  if(towerType==="radio") radioTowers.push({...baseTower, radius:120});

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
  const point = getCanvasPoint(e.clientX, e.clientY);
  handleInput(point.x, point.y, true);
});

window.addEventListener('keydown', e=>{
  if (e.key==='1') selectedTower='hug';
  if (e.key==='2') selectedTower='dog';
  if (e.key==='3') selectedTower='affirm';
  if (e.key==='4') selectedTower='radio';
});

// =========================
// LOOP
// =========================
function loop(t){
  const dt=(t-last)/1000;
  last=t;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt){
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

  if(state.waveTextTimer>0){
    state.waveTextTimer-=dt;
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

function drawTowerSpriteCentered(ctx, centerX, centerY, pixels, size, tOffset, amp, speed) {
  const topLeftX = centerX - (TOWER_PIXEL_DIM * size) / 2;
  const topLeftY = centerY - (TOWER_PIXEL_DIM * size) / 2;
  drawPixelArtWithBounce(ctx, topLeftX, topLeftY, pixels, size, tOffset, amp, speed);
}

function drawTowerGrumpiness(ctx, tower) {
  ctx.fillStyle = "rgba(40, 20, 30, 0.5)";
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#2b1f1a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y + 3, 5, 1.15 * Math.PI, 1.85 * Math.PI);
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

    drawTowerSpriteCentered(ctx, 135, 215, towerPixelArt.hug, 6, 0.2, 2, 0.004);
    drawTowerSpriteCentered(ctx, 290, 212, towerPixelArt.dog, 6, 1.0, 2, 0.005);
    drawTowerSpriteCentered(ctx, 470, 218, towerPixelArt.affirm, 6, 1.8, 2, 0.0045);
    drawTowerSpriteCentered(ctx, 640, 214, towerPixelArt.radio, 6, 2.6, 2, 0.0055);

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
        "This game was made by EricOP, Asa, Thea, and Codex. Codex was our hard working robotic partner.",
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
          scale: page.icon.isBoss ? 1.5 : 1,
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
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="white";
    ctx.font="32px sans-serif";
    ctx.textAlign="center";
    ctx.fillText(
      state.win?"You spread kindness!":"You have lost!",
      canvas.width/2,162
    );

    if (state.win) {
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
    ctx.fillText("Tap to return to menu",canvas.width/2,290);
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

  // hugTowers.forEach(t=>{
  //   ctx.fillStyle='brown';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,12,0,Math.PI*2);
  //   ctx.fill();
  // });
  hugTowers.forEach((t,i)=>{
    drawTowerSpriteCentered(ctx, t.x, t.y, towerPixelArt.hug, 4, i*0.5, 2, 0.006);
    if (t.isGrumpy) drawTowerGrumpiness(ctx, t);
  });

  // therapyDogs.forEach(d=>{
  //   ctx.fillStyle='orange';
  //   ctx.beginPath();
  //   ctx.arc(d.x,d.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  therapyDogs.forEach((d,i)=>{
    drawTowerSpriteCentered(ctx, d.x, d.y, towerPixelArt.dog, 4, i*0.3, 1.5, 0.007);
    if (d.isGrumpy) drawTowerGrumpiness(ctx, d);
  });

  // affirmTowers.forEach(t=>{
  //   ctx.fillStyle='purple';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  affirmTowers.forEach((t,i)=>{
    drawTowerSpriteCentered(ctx, t.x, t.y, towerPixelArt.affirm, 4, i*0.2, 1.8, 0.008);
    if (t.isGrumpy) drawTowerGrumpiness(ctx, t);
  });

  // radioTowers.forEach(t=>{
  //   ctx.strokeStyle='cyan';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
  //   ctx.stroke();

  //   ctx.fillStyle='blue';
  //   ctx.beginPath();
  //   ctx.arc(t.x,t.y,10,0,Math.PI*2);
  //   ctx.fill();
  // });
  radioTowers.forEach((t,i)=>{
    ctx.strokeStyle='rgba(0,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
    ctx.stroke();

    drawTowerSpriteCentered(ctx, t.x, t.y, towerPixelArt.radio, 4, i*0.4, 2.5, 0.005);
    if (t.isGrumpy) drawTowerGrumpiness(ctx, t);
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
      const canAfford = state.careCredits >= towerCosts[button.towerType];

      ctx.fillStyle = "#243b55";
      ctx.fillRect(button.x, button.y, button.w, button.h);

      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(button.x, button.y, button.w, button.h);

      ctx.fillStyle = canAfford ? "#ffffff" : "#8a8a8a";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${button.label} (${towerCosts[button.towerType]})`,
        button.x + button.w / 2,
        button.y + button.h / 2
      );
    }
  }



  if(state.waveTextTimer>0){
    const currentRoundHpBonus = Math.max(0, state.currentRound - 1);
    ctx.font="24px sans-serif";
    ctx.textAlign="center";
    ctx.fillText(
      `Round ${state.currentRound}: ${state.totalSpawned} Grumpies Incoming!`,
      canvas.width/2,60
    );
    ctx.font = "16px sans-serif";
    ctx.fillText(
      `This round beefs grumpies up by +${currentRoundHpBonus} sad meter`,
      canvas.width / 2,
      86
    );
    if (state.currentRound < state.totalRounds) {
      ctx.fillText(
        `Next round adds +${ROUND_SPAWN_INCREASE} grumpies and +1 sad meter`,
        canvas.width / 2,
        108
      );
    }
  }

  if (state.gameMode === "paused") {
    ctx.fillStyle = "rgba(7, 16, 28, 0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#15263f";
    ctx.fillRect(canvas.width / 2 - 150, 118, 300, 196);
    ctx.strokeStyle = "#f0f6ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 150, 118, 300, 196);

    ctx.fillStyle = "white";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Paused", canvas.width / 2, 138);

    ctx.font = "15px sans-serif";
    ctx.fillStyle = "#d9e7ff";
    ctx.fillText(`Round ${state.pausedFromRound} is waiting for you`, canvas.width / 2, 172);

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
  }
}

requestAnimationFrame(loop);
