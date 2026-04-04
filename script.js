const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
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
let direction;
let nextDirection;
let food;
let score;
let bestScore = Number.parseInt(localStorage.getItem("snake-best-score") || "0", 10);
let gameLoop;
let gameOver;
let photoObjectUrl;

bestScoreElement.textContent = String(bestScore);

function randomFoodPosition() {
  let position;

  do {
    position = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake.some((segment) => segment.x === position.x && segment.y === position.y));

  return position;
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
  direction = { x: 1, y: 0 };
  nextDirection = direction;
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

  const hitWall =
    head.x < 0 || head.y < 0 || head.x >= tileCount || head.y >= tileCount;
  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreElement.textContent = String(score);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem("snake-best-score", String(bestScore));
      bestScoreElement.textContent = String(bestScore);
    }
    food = randomFoodPosition();
  } else {
    snake.pop();
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
window.addEventListener("beforeunload", () => {
  if (photoObjectUrl) {
    URL.revokeObjectURL(photoObjectUrl);
  }
});

resetGame();
