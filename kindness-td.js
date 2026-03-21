// =========================
// SETUP
// =========================
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

canvas.width = 780;
canvas.height = 360;

let last = 0;

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
  gameOver: false,
  win: false,
  careCredits: 100,
  gameMode: "menu",
  waveTextTimer: 0
};

const START = { x: 0, y: Math.floor(grid.rows / 2) };
const END = { x: grid.cols - 1, y: Math.floor(grid.rows / 2) };
const HAPPY_HANGOUT = {
  x: canvas.width - 140,
  y: 20,
  width: 120,
  height: 70
};

function moveToHappyHangout(grumpy, dt) {
  const tx = HAPPY_HANGOUT.x + HAPPY_HANGOUT.width / 2;
  const ty = HAPPY_HANGOUT.y + HAPPY_HANGOUT.height / 2;
  const dx = tx - grumpy.x;
  const dy = ty - grumpy.y;
  const d = Math.hypot(dx, dy);

  if (d > 2) {
    grumpy.x += (dx / d) * grumpy.speed * dt;
    grumpy.y += (dy / d) * grumpy.speed * dt;
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

// =========================
// MENU
// =========================
const startButton = {
  x: canvas.width/2 - 100,
  y: canvas.height/2,
  w: 200,
  h: 50
};

const towerCosts = {
  hug: 30,
  dog: 60,
  affirm: 20,
  radio: 50
};

const buildMenuButtons = [
  { label: "Hugger", towerType: "hug", direction: "up" },
  { label: "TherapyDog", towerType: "dog", direction: "right" },
  { label: "AffirmingWords", towerType: "affirm", direction: "down" },
  { label: "GladRadio", towerType: "radio", direction: "left" }
];

function startGame() {
  state.grumpies = [];
  state.happyCount = 0;
  state.escapedSad = 0;
  state.gameOver = false;
  state.win = false;
  state.careCredits = 100;

  hugTowers.length = 0;
  therapyDogs.length = 0;
  affirmTowers.length = 0;
  radioTowers.length = 0;
  grid.blocked.clear();

  for (let i=0;i<state.totalSpawned;i++) {
    const g = createGrumpy(i*0.6);
    g.path = findPath(START, END) || [];
    state.grumpies.push(g);
  }

  state.waveTextTimer = 2.5;
  state.gameMode = "playing";
  placementMenu.active = false;
}

// =========================
// GRUMPY
// =========================
function createGrumpy(delay=0){
  return {
    x: START.x*GRID_SIZE+20,
    y: START.y*GRID_SIZE+20,
    speed:40,
    sad:100,
    maxSad:100,
    delay,
    active:false,
    isHappy:false,
    inHappyHangout:false,
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
        if(this.sad>0) state.escapedSad++;
      }
    },

    draw(ctx){
      ctx.fillStyle=this.isHappy?'gold':'gray';
      ctx.beginPath();
      ctx.arc(this.x,this.y,10,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle='red';
      ctx.fillRect(this.x-10,this.y-18,20,3);

      ctx.fillStyle='lime';
      ctx.fillRect(this.x-10,this.y-18,20*(1-this.sad/this.maxSad),3);

      if(this.isHugged){
        ctx.strokeStyle='pink';
        const t=performance.now()*0.005;
        for(let i=0;i<2;i++){
          const a=t+i*Math.PI;
          ctx.beginPath();
          ctx.moveTo(this.x+Math.cos(a)*12,this.y+Math.sin(a)*12);
          ctx.lineTo(this.x+Math.cos(a+1)*12,this.y+Math.sin(a+1)*12);
          ctx.stroke();
        }
      }
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

// =========================
// SYSTEMS
// =========================
function applyCareCredits(dt){
  radioTowers.forEach(t=>{
    state.grumpies.forEach(g=>{
      if(!g.active||g.isHappy) return;
      if(Math.hypot(g.x-t.x,g.y-t.y)<t.radius){
        g.sad-=20*dt;
        if(g.sad<=0){
          g.sad=0;
          g.isHappy=true;
          state.happyCount++;
          state.careCredits+=10;
        }
      }
    });
  });
}

function applyHugs(dt){
  hugTowers.forEach(t=>{
    if(!t.target){
      for(let g of state.grumpies){
        if(!g.active||g.isHappy) continue;
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
        g.sad=0;
        g.isHappy=true;
        g.isHugged=false;
        state.happyCount++;
        state.careCredits+=10;
        t.target=null;
      }
    }
  });
}

function applyTherapyDogs(dt){
  therapyDogs.forEach(d=>{
    d.targets=d.targets.filter(g=>!g.isHappy);

    const candidates=state.grumpies.filter(g=>{
      if(!g.active||g.isHappy) return false;
      if(d.targets.includes(g)) return false;
      return Math.hypot(g.x-d.x,g.y-d.y)<d.range;
    });

    for(let g of candidates){
      if(d.targets.length>=4) break;
      d.targets.push(g);
    }

    d.targets.forEach(g=>{
      g.x+=(d.x-g.x)*0.04;
      g.y+=(d.y-g.y)*0.04;
      g.sad-=20*dt;

      if(g.sad<=0){
        g.sad=0;
        g.isHappy=true;
        g.isHugged=false;
        state.happyCount++;
        state.careCredits+=10;
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
    if (
      t.target &&
      (t.target.isHappy || t.target.reachedEnd)
    ) {
      t.target = null;
    }

    if(!t.target){
      for(let g of state.grumpies){
        if(!g.active||g.isHappy) continue;
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
        g.sad=0;
        g.isHappy=true;
        state.happyCount++;
        state.careCredits+=10;
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
  const width = 100;
  const height = 28;

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

function handleInput(clientX,clientY,click=false){

if (state.gameMode === "menu") {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (click) {
    if (
      x >= startButton.x &&
      x <= startButton.x + startButton.w &&
      y >= startButton.y &&
      y <= startButton.y + startButton.h
    ) {
      startGame();
    }
  }
  return;
}

  if(state.gameMode==="gameover"){
    placementMenu.active = false;
    if(click) state.gameMode="menu";
    return;
  }

  const rect=canvas.getBoundingClientRect();
  const x=clientX-rect.left;
  const y=clientY-rect.top;

  mouse.x=x; mouse.y=y;
  const {cx,cy}=getCell(x,y);

  if (placementMenu.active) {
    preview.cx = placementMenu.cx;
    preview.cy = placementMenu.cy;

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

  preview.cx=cx; preview.cy=cy;

  const key=cellKey(cx,cy);

  if(grid.blocked.has(key)){
    preview.valid=false;
  } else {
    grid.blocked.add(key);
    preview.valid=!!findPath(START,END);
    grid.blocked.delete(key);
  }

  if(click && preview.valid){
    placementMenu.active = true;
    placementMenu.cx = cx;
    placementMenu.cy = cy;
  }
}

function placeTower(cx,cy,towerType=selectedTower){
  const cost=towerCosts[towerType];
  if(state.careCredits<cost) return;

  state.careCredits-=cost;

  const x=cx*GRID_SIZE+20;
  const y=cy*GRID_SIZE+20;

  if(towerType==="hug") hugTowers.push({x,y,range:40,target:null});
  if(towerType==="dog") therapyDogs.push({x,y,speed:60,range:120,targets:[]});
  if(towerType==="affirm") affirmTowers.push({x,y,range:140,target:null,cooldown:0});
  if(towerType==="radio") radioTowers.push({x,y,radius:120});

  grid.blocked.add(cellKey(cx,cy));
  refreshGrumpyPaths();
}

canvas.addEventListener('mousemove',e=>handleInput(e.clientX,e.clientY,false));
canvas.addEventListener('click',e=>handleInput(e.clientX,e.clientY,true));

canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  handleInput(e.touches[0].clientX,e.touches[0].clientY,false);
});

canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  handleInput(e.touches[0].clientX,e.touches[0].clientY,true);
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
  if(state.gameMode!=="playing") return;

  state.grumpies.forEach(g=>g.update(dt));

  applyCareCredits(dt);
  applyHugs(dt);
  applyTherapyDogs(dt);
  applyAffirmations(dt);
  updateTextBubbles(dt);

  if(state.escapedSad>=state.maxEscaped){
    state.gameMode="gameover";
    state.win=false;
  }

  if(state.happyCount===state.totalSpawned){
    state.gameMode="gameover";
    state.win=true;
  }

  if(state.waveTextTimer>0){
    state.waveTextTimer-=dt;
  }
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(state.gameMode==="menu"){
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="white";
    ctx.font="bold 48px sans-serif";
    ctx.textAlign="center";
    ctx.fillText("KINDNESS TD",canvas.width/2,150);

    ctx.fillStyle="blue";
    ctx.fillRect(startButton.x,startButton.y,startButton.w,startButton.h);

    ctx.fillStyle="white";
    ctx.font="20px sans-serif";
    ctx.fillText("Start Game",canvas.width/2,startButton.y+32);
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
      canvas.width/2,200
    );

    ctx.font="20px sans-serif";
    ctx.fillText("Tap to return to menu",canvas.width/2,260);
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

  hugTowers.forEach(t=>{
    ctx.fillStyle='brown';
    ctx.beginPath();
    ctx.arc(t.x,t.y,12,0,Math.PI*2);
    ctx.fill();
  });

  therapyDogs.forEach(d=>{
    ctx.fillStyle='orange';
    ctx.beginPath();
    ctx.arc(d.x,d.y,10,0,Math.PI*2);
    ctx.fill();
  });

  affirmTowers.forEach(t=>{
    ctx.fillStyle='purple';
    ctx.beginPath();
    ctx.arc(t.x,t.y,10,0,Math.PI*2);
    ctx.fill();
  });

  radioTowers.forEach(t=>{
    ctx.strokeStyle='cyan';
    ctx.beginPath();
    ctx.arc(t.x,t.y,t.radius,0,Math.PI*2);
    ctx.stroke();

    ctx.fillStyle='blue';
    ctx.beginPath();
    ctx.arc(t.x,t.y,10,0,Math.PI*2);
    ctx.fill();
  });

  state.grumpies.forEach(g=>g.draw(ctx));

  textBubbles.forEach(b=>{
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
  ctx.fillText(`careCredits: ${state.careCredits}`,10,20);
  ctx.fillText(`selected: ${selectedTower}`,10,40);

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
    ctx.font="24px sans-serif";
    ctx.textAlign="center";
    ctx.fillText(
      "Level 1: 25 Grumpies Incoming!",
      canvas.width/2,60
    );
  }
}

requestAnimationFrame(loop);
