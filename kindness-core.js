// =========================
// SETUP
// =========================
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const gameMount = document.getElementById("gameMount");
const fullscreenButtonEl = document.getElementById("fullscreenButton");
gameMount.appendChild(canvas);

canvas.width = 780;
canvas.height = 360;
canvas.style.width = "100%";
canvas.style.height = "auto";
canvas.style.touchAction = "none";

let last = 0;
let pseudoFullscreen = false;

function updateFullscreenUi() {
  const isFullscreen = !!document.fullscreenElement || pseudoFullscreen;
  document.body.classList.toggle("fullscreen-mode", isFullscreen);
  if (fullscreenButtonEl) {
    fullscreenButtonEl.textContent = isFullscreen ? "Exit Full Screen" : "Full Screen";
  }
}

async function toggleFullscreen() {
  if (!document.fullscreenElement && !pseudoFullscreen) {
    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        return;
      } catch (error) {
        pseudoFullscreen = true;
        updateFullscreenUi();
        return;
      }
    }

    pseudoFullscreen = true;
    updateFullscreenUi();
    return;
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  pseudoFullscreen = false;
  updateFullscreenUi();
}

if (fullscreenButtonEl) {
  fullscreenButtonEl.addEventListener("click", () => {
    toggleFullscreen();
  });
}

document.addEventListener("fullscreenchange", () => {
  pseudoFullscreen = false;
  updateFullscreenUi();
});

// =========================
// GRID + PATHFINDING
// =========================
const GRID_SIZE = 40;

const grid = {
  cols: Math.floor(canvas.width / GRID_SIZE),
  rows: Math.floor(canvas.height / GRID_SIZE),
  blocked: new Set()
};

function getCell(x, y) {
  return {
    cx: Math.floor(x / GRID_SIZE),
    cy: Math.floor(y / GRID_SIZE)
  };
}

function cellKey(cx, cy) {
  return cx + "," + cy;
}

function findPath(start, end) {
  const open = [start];
  const cameFrom = {};
  const cost = {};
  const key = (x,y) => x+","+y;

  cost[key(start.x,start.y)] = 0;

  while (open.length) {
    const current = open.shift();

    if (current.x === end.x && current.y === end.y) {
      const path = [];
      let c = key(current.x,current.y);

      while (c) {
        const [x,y] = c.split(',').map(Number);
        path.push({x,y});
        c = cameFrom[c];
      }

      return path.reverse();
    }

    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    for (let [dx,dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx<0||ny<0||nx>=grid.cols||ny>=grid.rows) continue;

      const k = key(nx,ny);
      if (grid.blocked.has(k)) continue;

      const newCost = cost[key(current.x,current.y)] + 1;

      if (cost[k]===undefined || newCost<cost[k]) {
        cost[k]=newCost;
        cameFrom[k]=key(current.x,current.y);
        open.push({x:nx,y:ny});
      }
    }
  }
  return null;
}

// =========================
// STATE
// =========================
const state = {
  grumpies: [],
  happyCount: 0,
  escapedSad: 0,
  maxEscaped: 5,
  totalSpawned: 25,
  currentRound: 1,
  totalRounds: 10,
  gameOver: false,
  win: false,
  careCredits: 100,
  gameMode: "menu",
  waveTextTimer: 0,
  pendingRound: 1,
  instructionPages: [],
  instructionPageIndex: 0,
  pausedFromRound: 1,
  menuCreditsOpen: false,
  advancedUnlocked: false,
  advancedMode: false,
  justUnlockedAdvanced: false
};

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
