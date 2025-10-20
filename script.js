// Preload sound effects for instant playback
const preloadedSounds = {
  waterDrop: new Audio('mp3/water-drop.mp3'),
  wrong: new Audio('mp3/wrong.mp3'),
  fanfare: new Audio('mp3/success-fanfare-trumpets.mp3')
};
preloadedSounds.waterDrop.load();
preloadedSounds.wrong.load();
preloadedSounds.fanfare.load();

// Play Again button functionality
document.querySelector('.play-again-btn').addEventListener('click', function() {
  // Hide gameover overlay
  document.getElementById('gameover-overlay').classList.add('hidden');
  // Show start overlay
  document.getElementById('overlay').classList.remove('hidden');
  // Reset score and lives
  document.getElementById('score').textContent = '0';
  document.getElementById('lives').textContent = '3';
  // Remove all drops from game container
  document.querySelectorAll('.drop-wrapper').forEach(drop => drop.remove());
  // Reset timer display
  document.getElementById('time').textContent = '30';
  // Reset bucket position
  centerBucket();
  // Stop any running intervals
  if (typeof window.timerInterval !== 'undefined') {
    clearInterval(window.timerInterval);
  }
  if (typeof dropMaker !== 'undefined') {
    clearInterval(dropMaker);
  }
  gameRunning = false;
});
// Smooth bucket movement logic

const bucket = document.getElementById("bucket");
const gameContainer = document.getElementById("game-container");
let bucketX = 0;
let leftPressed = false;
let rightPressed = false;
const speed = 8; // pixels per frame

function getBucketWidth() {
  return bucket.offsetWidth;
}

function setBucketPosition() {
  bucket.style.left = bucketX + "px";
}

function centerBucket() {
  const bucketWidth = getBucketWidth();
  bucketX = (gameContainer.offsetWidth - bucketWidth) / 2;
  setBucketPosition();
}

centerBucket();

function moveBucket() {
  if (!gameRunning) return;
  const bucketWidth = getBucketWidth();
  if (leftPressed) {
    bucketX = Math.max(0, bucketX - speed);
  }
  if (rightPressed) {
    bucketX = Math.min(gameContainer.offsetWidth - bucketWidth, bucketX + speed);
  }
  setBucketPosition();
  requestAnimationFrame(moveBucket);
}

window.addEventListener("keydown", function(e) {
  if (e.key === "ArrowLeft") leftPressed = true;
  if (e.key === "ArrowRight") rightPressed = true;
});

window.addEventListener("keyup", function(e) {
  if (e.key === "ArrowLeft") leftPressed = false;
  if (e.key === "ArrowRight") rightPressed = false;
});

// Re-center bucket on resize
window.addEventListener("resize", function() {
  centerBucket();
});

// Start bucket movement loop when game starts
function startBucketMovement() {
  requestAnimationFrame(moveBucket);
}
// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
// Track recent drop positions to avoid overlap
let recentDropPositions = [];
const MIN_DROP_DISTANCE = 80; // Minimum distance in px between drops
const RECENT_DROP_TIME = 1000; // ms to keep positions

// Difficulty configuration
const difficulties = {
  easy: { spawnInterval: 1200, fallDuration: 5000 },   // slower spawn, slower fall
  normal: { spawnInterval: 1000, fallDuration: 4000 }, // original baseline
  hard: { spawnInterval: 650, fallDuration: 3000 }     // faster spawn, faster fall
};

let currentDifficulty = 'normal';

// Wire difficulty buttons
const easyBtn = document.getElementById('easy-btn');
const normalBtn = document.getElementById('normal-btn');
const hardBtn = document.getElementById('hard-btn');

if (easyBtn && normalBtn && hardBtn) {
  easyBtn.addEventListener('click', () => startGame('easy'));
  normalBtn.addEventListener('click', () => startGame('normal'));
  hardBtn.addEventListener('click', () => startGame('hard'));
}

// Hide overlay when game starts
function hideOverlay() {
  document.getElementById("overlay").classList.add("hidden");
}

function startGame(difficulty = 'normal') {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  gameRunning = true;
  currentDifficulty = difficulty in difficulties ? difficulty : 'normal';
  hideOverlay();

  // Start smooth bucket movement
  startBucketMovement();

  // Create new drops based on difficulty spawn rate
  dropMaker = setInterval(createDrop, difficulties[currentDifficulty].spawnInterval);

  // Start countdown timer
  let timeLeft = 30;
  const timeElem = document.getElementById("time");
  timeElem.textContent = timeLeft;
  // Make timerInterval accessible outside startGame
  window.timerInterval = setInterval(() => {
    if (!gameRunning) {
      clearInterval(window.timerInterval);
      return;
    }
    timeLeft--;
    timeElem.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(window.timerInterval);
      gameRunning = false;
      // Stop drop spawning
      clearInterval(dropMaker);
      // Freeze all drops by pausing their animations
      const drops = document.querySelectorAll('.drop-wrapper');
      drops.forEach(drop => {
        drop.style.animationPlayState = 'paused';
      });
      // Play success fanfare sound
      preloadedSounds.fanfare.currentTime = 0;
      preloadedSounds.fanfare.play();
      // Show game over overlay
      document.getElementById('gameover-overlay').classList.remove('hidden');
      const scoreElem = document.getElementById('score');
      const gameoverScoreElem = document.getElementById('gameover-score');
      if (scoreElem && gameoverScoreElem) {
        gameoverScoreElem.textContent = scoreElem.textContent;
      }
      // Optionally, you can add game over logic here
    }
  }, 1000);
}

function createDrop() {
  // Make good drops much more likely than bad drops
  // Example: 70% good, 7.5% for each bad drop
  const rand = Math.random();
  let dropType;
  if (rand < 0.7) {
    dropType = 0; // good drop
  } else {
    // Randomly pick one of the 4 dirty drop types
    dropType = 1 + Math.floor(Math.random() * 4); // 1, 2, 3, or 4
  }
  // Create a wrapper div for animation and positioning
  const drop = document.createElement("div");
  drop.className = "drop-wrapper" + (dropType === 1 ? " banana-drop" : "");
  // Set animation duration based on difficulty
  const fallMs = difficulties[currentDifficulty].fallDuration;
  drop.style.animationDuration = `${fallMs}ms`;
  // Ensure wrapper knows the drop size for accurate fall distance in CSS
  // We'll set this after computing dropSize below; placeholder for now
  // Responsive drop size: match CSS media query
  let dropSize;
  if (window.innerWidth <= 576) {
    dropSize = dropType === 1 ? 78 : 52;
  } else {
    dropSize = dropType === 1 ? 90 : 60;
  }
  drop.style.setProperty('--drop-size', dropSize + 'px');
  // Position the drop randomly across the game width, but not too close to recent drops
  const gameWidth = gameContainer.offsetWidth;
  let xPosition;
  let attempts = 0;
  do {
    xPosition = Math.random() * (gameWidth - dropSize);
    attempts++;
    // Check if this position is far enough from all recent positions
  } while (
    recentDropPositions.some(pos => Math.abs(pos - xPosition) < MIN_DROP_DISTANCE) && attempts < 10
  );
  drop.style.left = xPosition + "px";
  drop.style.top = -dropSize + "px"; // Spawn above the container
  // Animation and z-index now handled by CSS

  // Store this position and clean up old ones
  recentDropPositions.push(xPosition);
  setTimeout(() => {
    recentDropPositions = recentDropPositions.filter(pos => pos !== xPosition);
  }, RECENT_DROP_TIME);

  // Create the image for the drop
  const img = document.createElement("img");
  img.className = "drop-img";
  img.style.setProperty("--drop-size", dropSize + "px");
  img.style.pointerEvents = "auto";
  img.draggable = false;
    // Generate a random rotation angle for each drop
    let rotationAngle = 0;
    if (dropType === 1 || dropType === 3 || dropType === 4) { // Banana, Fly, SodaCan
      rotationAngle = Math.floor(Math.random() * 360); // 0-359 degrees
      img.style.transform = `rotate(${rotationAngle}deg)`;
    }
  if (dropType === 0) {
    img.src = "img/CleanDrop.svg";
    img.alt = "Clean Drop";
  } else if (dropType === 1) {
    img.src = "img/Banana.svg";
    img.alt = "Banana";
  } else if (dropType === 2) {
    img.src = "img/DirtyDrop.svg";
    img.alt = "Dirty Drop";
  } else if (dropType === 3) {
    img.src = "img/Fly.svg";
    img.alt = "Fly";
  } else {
    img.src = "img/SodaCan.svg";
    img.alt = "Soda Can";
  }
  drop.appendChild(img);

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  // Collision detection: remove drop if it hits the top 40% of the bucket
  function checkCollision() {
    const dropRect = drop.getBoundingClientRect();
    const bucketRect = bucket.getBoundingClientRect();
    // Top 40% of the bucket
    const bucketTopZone = bucketRect.top + 0.4 * bucketRect.height;
    // Exclude rightmost 20% of the bucket
    const bucketLeftZone = bucketRect.left;
    const bucketRightZone = bucketRect.left + 0.8 * bucketRect.width;
    // Check horizontal overlap ONLY in leftmost 80%
    const horizontalOverlap = dropRect.right > bucketLeftZone && dropRect.left < bucketRightZone;
    // Check if drop bottom is within top 15% of bucket
    const verticalCollision = dropRect.bottom >= bucketRect.top && dropRect.bottom <= bucketTopZone;
    if (horizontalOverlap && verticalCollision) {
      if (dropType === 0) {
        // Clear drop: increase score
        const scoreElem = document.getElementById("score");
        scoreElem.textContent = parseInt(scoreElem.textContent) + 1;
        // Play water-drop sound effect
        preloadedSounds.waterDrop.currentTime = 0;
        preloadedSounds.waterDrop.play();
      } else {
        // Bad drop: play wrong sound
        preloadedSounds.wrong.currentTime = 0;
        preloadedSounds.wrong.play();
        // Bad drop: decrease lives, but not below zero
        const livesElem = document.getElementById("lives");
        const currentLives = parseInt(livesElem.textContent);
        if (currentLives > 0) {
          livesElem.textContent = currentLives - 1;
          if (currentLives - 1 === 0) {
            // Game over: lives reached zero
            gameRunning = false;
            clearInterval(dropMaker);
            // Stop timer
            if (typeof window.timerInterval !== 'undefined') {
              clearInterval(window.timerInterval);
            }
            // Freeze all drops
            const drops = document.querySelectorAll('.drop-wrapper');
            drops.forEach(drop => {
              drop.style.animationPlayState = 'paused';
            });
            // Play success fanfare sound
            preloadedSounds.fanfare.currentTime = 0;
            preloadedSounds.fanfare.play();
            // Set the score in the game over card
            const scoreElem = document.getElementById('score');
            const gameoverScoreElem = document.getElementById('gameover-score');
            if (scoreElem && gameoverScoreElem) {
              gameoverScoreElem.textContent = scoreElem.textContent;
            }
            // Show game over overlay
            document.getElementById('gameover-overlay').classList.remove('hidden');
          }
        }
      }
      drop.remove();
      return;
    }
    // If drop is still in game, keep checking
    if (document.body.contains(drop)) {
      requestAnimationFrame(checkCollision);
    }
  }
  requestAnimationFrame(checkCollision);

  // Remove drops that reach the bottom
  drop.addEventListener("animationend", () => {
    drop.remove(); // Clean up drops that weren't caught
  });
}
