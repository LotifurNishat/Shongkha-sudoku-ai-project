let selectedDifficulty = "medium";

// Home → Setup page
function goSetup() {
  window.location.href = "/setup";
}

// Setup → Home page
function goHome() {
  window.location.href = "/";
}

// Difficulty selection
function selectDifficulty(level) {
  selectedDifficulty = level;

  document.getElementById("easy").classList.remove("bg-blue-600");
  document.getElementById("medium").classList.remove("bg-blue-600");
  document.getElementById("hard").classList.remove("bg-blue-600");

  document.getElementById(level).classList.add("bg-blue-600");
}

// Start game
function startGame() {
  window.location.href = "/game?difficulty=" + selectedDifficulty;
}