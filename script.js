const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const snakeCountInput = document.getElementById("ai-snake-count");
const restartButton = document.getElementById("restart");
const capturePhotoButton = document.getElementById("capture-photo");
const photoStatusElement = document.getElementById("photo-status");
const photoPreviewElement = document.getElementById("photo-preview");

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const tickDelay = 140;
const directions = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

let snake = [];
let aiSnakes = [];
let direction;
let nextDirection;
let aiDirections = [];
let food;
let score;
let bestScore = Number.parseInt(localStorage.getItem("snake-best-score") || "0", 10);
let gameLoop;
let gameOver;
let photoObjectUrl;

const maxAiSnakes = Number.parseInt(snakeCountInput.max, 10);

bestScoreElement.textContent = String(bestScore);

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

function randomFoodPosition() {
  let position;

  do {
    position = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (
    snake.some((segment) => segment.x === position.x && segment.y === position.y) ||
    aiSnakes.some((aiSnake) =>
      aiSnake.some((segment) => segment.x === position.x && segment.y === position.y)
    )
  );

  return position;
}

function willEat(head) {
  return head.x === food.x && head.y === food.y;
}

function getProjectedOccupiedCells(nextSnakeHead, nextAiHeads) {
  const occupiedCells = new Set();
  const nextSnakeBody = willEat(nextSnakeHead) ? snake : snake.slice(0, -1);

  nextSnakeBody.forEach((segment) => occupiedCells.add(cellKey(segment)));
  aiSnakes.forEach((aiSnake, index) => {
    const nextAiHead = nextAiHeads[index];
    const aiWillEat = nextAiHead ? willEat(nextAiHead) : false;
    const nextAiBody = aiWillEat ? aiSnake : aiSnake.slice(0, -1);
    nextAiBody.forEach((segment) => occupiedCells.add(cellKey(segment)));
  });

  return occupiedCells;
}

function isValidMove(head, occupiedCells) {
  const hitWall =
    head.x < 0 || head.y < 0 || head.x >= tileCount || head.y >= tileCount;

  return !hitWall && !occupiedCells.has(cellKey(head));
}

function getAiNextDirection(aiIndex, nextAiHeads) {
  const aiSnake = aiSnakes[aiIndex];
  const aiDirection = aiDirections[aiIndex];
  const options = Object.values(directions).filter(
    (candidate) => candidate.x !== -aiDirection.x || candidate.y !== -aiDirection.y
  );
  const safeMoves = options
    .map((candidate) => {
      const candidateHead = {
        x: aiSnake[0].x + candidate.x,
        y: aiSnake[0].y + candidate.y,
      };
      const projectedSnakeHead = {
        x: snake[0].x + nextDirection.x,
        y: snake[0].y + nextDirection.y,
      };
      const candidateAiHeads = nextAiHeads.concat(candidateHead);
      const occupiedCells = getProjectedOccupiedCells(projectedSnakeHead, candidateAiHeads);

      return {
        candidate,
        candidateHead,
        isSafe:
          isValidMove(candidateHead, occupiedCells) &&
          cellKey(candidateHead) !== cellKey(projectedSnakeHead) &&
          !nextAiHeads.some((head) => cellKey(head) === cellKey(candidateHead)),
        distance: Math.abs(candidateHead.x - food.x) + Math.abs(candidateHead.y - food.y),
      };
    })
    .filter((option) => option.isSafe)
    .sort((left, right) => left.distance - right.distance);

  return safeMoves[0]?.candidate || aiDirection;
}

function getAiSnakeCount() {
  const parsedValue = Number.parseInt(snakeCountInput.value, 10);
  const boundedValue = Number.isNaN(parsedValue)
    ? 1
    : Math.min(Math.max(parsedValue, 1), maxAiSnakes);
  snakeCountInput.value = String(boundedValue);
  return boundedValue;
}

function createAiSnakes(count) {
  const snakes = [];
  const columns = 3;

  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const headX = 4 + column * 6;
    const headY = 2 + row * 3;

    snakes.push([
      { x: headX, y: headY },
      { x: headX - 1, y: headY },
      { x: headX - 2, y: headY },
    ]);
  }

  return snakes;
}

function resetGame() {
  if (gameLoop) {
    window.clearInterval(gameLoop);
  }

  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  aiSnakes = createAiSnakes(getAiSnakeCount());
  direction = { x: 1, y: 0 };
  nextDirection = direction;
  aiDirections = aiSnakes.map(() => ({ x: 1, y: 0 }));
  food = randomFoodPosition();
  score = 0;
  gameOver = false;
  scoreElement.textContent = "0";
  restartButton.textContent = "Restart";
  draw();
  gameLoop = window.setInterval(update, tickDelay);
}

function drawCell(x, y, color) {
  context.fillStyle = color;
  context.fillRect(x * gridSize + 1, y * gridSize + 1, gridSize - 2, gridSize - 2);
}

function draw() {
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawCell(food.x, food.y, "#f43f5e");
  snake.forEach((segment, index) => {
    drawCell(segment.x, segment.y, index === 0 ? "#4ade80" : "#22c55e");
  });
  aiSnakes.forEach((aiSnake) => {
    aiSnake.forEach((segment, index) => {
      drawCell(segment.x, segment.y, index === 0 ? "#60a5fa" : "#2563eb");
    });
  });

  if (gameOver) {
    context.fillStyle = "rgba(15, 23, 42, 0.78)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f8fafc";
    context.font = "bold 32px Arial";
    context.textAlign = "center";
    context.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 8);
    context.font = "18px Arial";
    context.fillText("Press restart to play again", canvas.width / 2, canvas.height / 2 + 26);
  }
}

function endGame() {
  gameOver = true;
  restartButton.textContent = "Play Again";
  draw();
}

function takePhoto() {
  canvas.toBlob((blob) => {
    if (!blob) {
      photoStatusElement.textContent = "Unable to take a photo right now.";
      return;
    }

    if (photoObjectUrl) {
      URL.revokeObjectURL(photoObjectUrl);
    }

    photoObjectUrl = URL.createObjectURL(blob);
    photoPreviewElement.src = photoObjectUrl;
    photoPreviewElement.alt = `Snake game photo at score ${score}`;
    photoPreviewElement.hidden = false;
    photoStatusElement.textContent = "Latest game photo:";
  }, "image/png");
}

function update() {
  if (gameOver) {
    return;
  }

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const nextAiDirections = [];
  const nextAiHeads = [];

  aiSnakes.forEach((aiSnake, index) => {
    const aiDirection = getAiNextDirection(index, nextAiHeads);
    nextAiDirections.push(aiDirection);
    nextAiHeads.push({
      x: aiSnake[0].x + aiDirection.x,
      y: aiSnake[0].y + aiDirection.y,
    });
  });
  const occupiedCells = getProjectedOccupiedCells(head, nextAiHeads);
  const nextHeadKeys = [head, ...nextAiHeads].map(cellKey);
  const hasHeadCollision = new Set(nextHeadKeys).size !== nextHeadKeys.length;
  const previousHeads = [snake[0], ...aiSnakes.map((aiSnake) => aiSnake[0])];
  const nextHeads = [head, ...nextAiHeads];
  let swappedHeads = false;

  for (let leftIndex = 0; leftIndex < previousHeads.length && !swappedHeads; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < previousHeads.length; rightIndex += 1) {
      if (
        cellKey(nextHeads[leftIndex]) === cellKey(previousHeads[rightIndex]) &&
        cellKey(nextHeads[rightIndex]) === cellKey(previousHeads[leftIndex])
      ) {
        swappedHeads = true;
        break;
      }
    }
  }

  if (
    !isValidMove(head, occupiedCells) ||
    nextAiHeads.some((aiHead) => !isValidMove(aiHead, occupiedCells)) ||
    hasHeadCollision ||
    swappedHeads
  ) {
    endGame();
    return;
  }

  snake.unshift(head);
  aiSnakes.forEach((aiSnake, index) => {
    aiSnake.unshift(nextAiHeads[index]);
  });
  aiDirections = nextAiDirections;

  const playerAte = willEat(head);
  const aiAte = nextAiHeads.map((aiHead) => willEat(aiHead));

  if (playerAte) {
    score += 1;
    scoreElement.textContent = String(score);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("snake-best-score", String(bestScore));
      bestScoreElement.textContent = String(bestScore);
    }
  } else {
    snake.pop();
  }

  aiSnakes.forEach((aiSnake, index) => {
    if (!aiAte[index]) {
      aiSnake.pop();
    }
  });

  if (playerAte || aiAte.some(Boolean)) {
    food = randomFoodPosition();
  }

  draw();
}

document.addEventListener("keydown", (event) => {
  const requestedDirection = directions[event.key];

  if (!requestedDirection) {
    return;
  }

  const reversing =
    requestedDirection.x === -direction.x && requestedDirection.y === -direction.y;

  if (!reversing) {
    nextDirection = requestedDirection;
  }
});

restartButton.addEventListener("click", resetGame);
capturePhotoButton.addEventListener("click", takePhoto);
snakeCountInput.addEventListener("change", resetGame);
window.addEventListener("beforeunload", () => {
  if (photoObjectUrl) {
    URL.revokeObjectURL(photoObjectUrl);
  }
});

resetGame();
