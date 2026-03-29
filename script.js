const GRID_SIZE = 20;
const CELL_SIZE = 28;
const START_LIVES = 3;
const BASE_INTERVAL = 140;
const MIN_INTERVAL = 80;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const livesEl = document.getElementById("lives");
const speedEl = document.getElementById("speed");
const overlayEl = document.getElementById("overlay");
const restartBtn = document.getElementById("restartBtn");

let snake;
let direction;
let nextDirection;
let food;
let score;
let lives;
let eatenCount;
let gameOver;
let stepInterval;
let loopId;
let highScore = Number(localStorage.getItem("snake_high_score") || 0);
let fireworks = [];
let fireworksUntil = 0;

const keyMap = {
  w: { x: 0, y: -1 },
  a: { x: -1, y: 0 },
  s: { x: 0, y: 1 },
  d: { x: 1, y: 0 },
};

function init() {
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  score = 0;
  lives = START_LIVES;
  eatenCount = 0;
  gameOver = false;
  stepInterval = BASE_INTERVAL;
  food = spawnFood();
  fireworks = [];
  fireworksUntil = 0;

  highScoreEl.textContent = highScore;
  hideOverlay();
  updateHud();
  startLoop();
}

function startLoop() {
  cancelAnimationFrame(loopId);
  let lastTime = 0;
  let accumulator = 0;

  function frame(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += delta;

    while (accumulator >= stepInterval) {
      tick();
      accumulator -= stepInterval;
    }

    draw();

    if (!gameOver) {
      loopId = requestAnimationFrame(frame);
    }
  }

  loopId = requestAnimationFrame(frame);
}

function tick() {
  direction = { ...nextDirection };
  const newHead = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };

  if (isWallCollision(newHead) || isSelfCollision(newHead)) {
    handleCrash();
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score += 1;
    eatenCount += 1;

    if (eatenCount % 10 === 0) {
      lives += 1;
      showOverlay("🎁 连吃10个，奖励 +1 条命！", 1200);
    }

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snake_high_score", String(highScore));
      triggerFireworks();
      showOverlay("🏆 新纪录！烟花庆祝中！", 1300);
    }

    const speedFactor = Math.min(score * 2.5, 60);
    stepInterval = Math.max(MIN_INTERVAL, BASE_INTERVAL - speedFactor);
    food = spawnFood();
  } else {
    snake.pop();
  }

  updateHud();
}

function isWallCollision(head) {
  return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
}

function isSelfCollision(head) {
  return snake.some((segment) => segment.x === head.x && segment.y === head.y);
}

function handleCrash() {
  lives -= 1;

  if (lives <= 0) {
    lives = 0;
    gameOver = true;
    showOverlay(`💥 游戏结束！最终分数：${score}<br/>按“重新开始”再来一局`);
    updateHud();
    return;
  }

  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  showOverlay(`⚠️ 撞到了！扣除1条命，剩余 ${lives} 条`, 1000);
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  livesEl.textContent = lives;
  speedEl.textContent = `${(BASE_INTERVAL / stepInterval).toFixed(1)}x`;
}

function spawnFood() {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((segment) => segment.x === position.x && segment.y === position.y));

  return position;
}

function draw() {
  drawGrid();
  drawFood();
  drawSnake();
  drawFireworks();
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < GRID_SIZE; x += 1) {
    for (let y = 0; y < GRID_SIZE; y += 1) {
      const isDark = (x + y) % 2 === 0;
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.02)";
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const px = segment.x * CELL_SIZE;
    const py = segment.y * CELL_SIZE;
    const isHead = index === 0;

    ctx.fillStyle = isHead ? "#34d399" : "#7cf29c";
    roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 7);
    ctx.fill();

    if (isHead) {
      ctx.fillStyle = "#063b2a";
      const eyeOffsetX = direction.x !== 0 ? (direction.x > 0 ? 19 : 9) : 9;
      const eyeOffsetY1 = direction.y > 0 ? 19 : 10;
      const eyeOffsetY2 = direction.y > 0 ? 19 : 18;
      ctx.beginPath();
      ctx.arc(px + eyeOffsetX, py + eyeOffsetY1, 2.4, 0, Math.PI * 2);
      ctx.arc(px + (direction.x !== 0 ? eyeOffsetX : 18), py + eyeOffsetY2, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawFood() {
  const cx = food.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = food.y * CELL_SIZE + CELL_SIZE / 2;

  ctx.beginPath();
  ctx.fillStyle = "#ff6f91";
  ctx.arc(cx, cy, CELL_SIZE * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2;
  ctx.moveTo(cx, cy - 12);
  ctx.quadraticCurveTo(cx + 7, cy - 20, cx + 11, cy - 10);
  ctx.stroke();
}

function triggerFireworks() {
  fireworksUntil = performance.now() + 2200;
  for (let i = 0; i < 8; i += 1) {
    createBurst();
  }
}

function createBurst() {
  const cx = Math.random() * canvas.width;
  const cy = Math.random() * (canvas.height * 0.6);
  const color = `hsl(${Math.floor(Math.random() * 360)}, 100%, 65%)`;

  for (let i = 0; i < 28; i += 1) {
    const angle = (Math.PI * 2 * i) / 28;
    const speed = 1 + Math.random() * 2.2;
    fireworks.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 48 + Math.floor(Math.random() * 16),
      color,
    });
  }
}

function drawFireworks() {
  const now = performance.now();
  if (now < fireworksUntil && Math.random() < 0.08) {
    createBurst();
  }

  fireworks = fireworks.filter((particle) => particle.life > 0);

  fireworks.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.03;
    particle.life -= 1;

    ctx.globalAlpha = Math.max(0, particle.life / 64);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 3, 3);
    ctx.globalAlpha = 1;
  });
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function showOverlay(message, timeout) {
  overlayEl.innerHTML = message;
  overlayEl.classList.remove("hidden");

  if (timeout) {
    window.clearTimeout(showOverlay.timer);
    showOverlay.timer = window.setTimeout(() => {
      if (!gameOver) {
        hideOverlay();
      }
    }, timeout);
  }
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const candidate = keyMap[key];
  if (!candidate || gameOver) return;

  const isReversing = candidate.x + direction.x === 0 && candidate.y + direction.y === 0;
  if (isReversing) return;

  nextDirection = { ...candidate };
});

restartBtn.addEventListener("click", init);

init();
