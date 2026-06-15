// ---------- DOM Elements ----------
const gridContainer = document.getElementById('sudoku-grid');
const timerDisplay = document.getElementById('timer-display');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const mistakesSpan = document.getElementById('mistakes-count');
const hintsSpan = document.getElementById('hints-count');
const aiMessageDiv = document.getElementById('ai-message');
const aiTypingDots = document.getElementById('ai-typing-dots');
const difficultyBadge = document.getElementById('difficulty-badge');
const winModal = document.getElementById('win-modal');
const winTimeSpan = document.getElementById('win-time');
const winHintsSpan = document.getElementById('win-hints');
const gameOverModal = document.getElementById('gameover-modal');
const gameOverTimeSpan = document.getElementById('gameover-time');
const gameOverHintsSpan = document.getElementById('gameover-hints');
const actionButtonsDiv = document.getElementById('ai-action-buttons');

// Buttons
const aiHintBtn = document.getElementById('ai-hint-btn');
const autoSolveBtn = document.getElementById('auto-solve-btn');
const undoBtn = document.getElementById('undo-btn');
const resetBtn = document.getElementById('reset-btn');
const stepBtn = document.getElementById('step-btn');
const menuBtn = document.getElementById('menu-btn');
const winHomeBtn = document.getElementById('win-home-btn');
const gameOverHomeBtn = document.getElementById('gameover-home-btn');

// ---------- Game State ----------
let sudokuBoard = null;
let mistakes = 0;
let hintsUsed = 0;
let timerSeconds = 0;
let timerInterval = null;
let isGameWon = false;
let isGameOver = false;
let settings = { timer: true, mistakes: true };

// ---------- Helper Functions ----------
function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const remainSec = sec % 60;
  return `${mins}:${remainSec.toString().padStart(2, '0')}`;
}

function updateProgress() {
  if (!sudokuBoard) return;
  const filled = sudokuBoard.board.flat().filter(cell => cell !== null).length;
  const percent = Math.round((filled / 81) * 100);
  if (progressPercent) progressPercent.innerText = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
}

function updateMistakesUI() {
  if (mistakesSpan) mistakesSpan.innerText = mistakes;
  if (settings.mistakes && mistakes >= 3 && !isGameWon && !isGameOver) {
    isGameOver = true;
    stopTimer();
    if (sudokuBoard) sudokuBoard.isReadOnly = true;
    if (gameOverTimeSpan) gameOverTimeSpan.innerText = formatTime(timerSeconds);
    if (gameOverHintsSpan) gameOverHintsSpan.innerText = hintsUsed;
    if (gameOverModal) {
      gameOverModal.classList.remove('hidden');
      gameOverModal.classList.add('flex');
    }
    aiMessageDiv.innerHTML = "GAME OVER: Too many mistakes.";
  }
}

function updateHintsUI() {
  if (hintsSpan) hintsSpan.innerText = hintsUsed.toString().padStart(2, '0');
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  if (!settings.timer || isGameWon || isGameOver) return;
  if (timerInterval) stopTimer();
  timerInterval = setInterval(() => {
    if (!isGameWon && !isGameOver) {
      timerSeconds++;
      if (timerDisplay) timerDisplay.innerText = formatTime(timerSeconds);
    }
  }, 1000);
}

function checkWin() {
  if (isGameWon || isGameOver || !sudokuBoard) return false;
  
  let allMatch = true;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (sudokuBoard.board[i][j] !== sudokuBoard.solvedBoard[i][j]) {
        allMatch = false;
        break;
      }
    }
  }
  
  if (allMatch) {
    isGameWon = true;
    stopTimer();
    sudokuBoard.isReadOnly = true;
    if (winTimeSpan) winTimeSpan.innerText = formatTime(timerSeconds);
    if (winHintsSpan) winHintsSpan.innerText = hintsUsed;
    if (winModal) {
      winModal.classList.remove('hidden');
      winModal.classList.add('flex');
    }
    canvasConfetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#ffffff', '#22c55e'] });
    aiMessageDiv.innerHTML = "Incredible. You have mastered the logic of numbers.";
    if (actionButtonsDiv) actionButtonsDiv.innerHTML = '';
    return true;
  }
  return false;
}

let warningTimeout = null;
function showWarningMessage(message, duration = 2000) {
  if (warningTimeout) clearTimeout(warningTimeout);
  aiMessageDiv.innerHTML = message;
  aiTypingDots.classList.add('hidden');
  warningTimeout = setTimeout(() => {
    if (aiMessageDiv.innerHTML === message) {
      aiMessageDiv.innerHTML = "Click a cell and press a number key to continue.";
    }
  }, duration);
}

// ---------- AI Panel Typing Effect ----------
let currentTypingTimeout = null;
function displayAIResponse(text, isAnalyzing = false) {
  if (currentTypingTimeout) clearTimeout(currentTypingTimeout);
  if (isAnalyzing) {
    aiMessageDiv.innerHTML = '<span class="text-slate-500 italic opacity-50">Mapping neural constraints...</span>';
    aiTypingDots.classList.remove('hidden');
    return;
  }
  aiTypingDots.classList.add('hidden');
  let index = 0;
  aiMessageDiv.innerHTML = '';
  function typeChar() {
    if (index < text.length) {
      aiMessageDiv.innerHTML = text.slice(0, index + 1);
      index++;
      currentTypingTimeout = setTimeout(typeChar, 20);
    } else {
      aiMessageDiv.classList.add('typing-cursor');
      setTimeout(() => aiMessageDiv.classList.remove('typing-cursor'), 1000);
    }
  }
  typeChar();
}

// ---------- API Calls ----------
async function fetchNewGame(difficulty) {
  const res = await fetch(`/api/new_game?difficulty=${difficulty}`);
  const data = await res.json();
  
  isGameWon = false;
  isGameOver = false;
  mistakes = 0;
  hintsUsed = 0;
  timerSeconds = 0;
  
  sudokuBoard.isReadOnly = false;
  sudokuBoard.setBoardData(data.board, data.initial, data.solved);
  
  updateMistakesUI();
  updateHintsUI();
  updateProgress();
  if (timerDisplay) timerDisplay.innerText = formatTime(0);
  
  if (settings.timer) startTimer();
  else stopTimer();
  
  aiMessageDiv.innerHTML = "Game ready. Click a cell and press a number key.";
  if (actionButtonsDiv) actionButtonsDiv.innerHTML = '';
}

async function getAIHint() {
  if (isGameWon || isGameOver || !sudokuBoard) return;
  const payload = {
    board: sudokuBoard.getBoardData(),
    row: sudokuBoard.selectedCell ? sudokuBoard.selectedCell[0] : null,
    col: sudokuBoard.selectedCell ? sudokuBoard.selectedCell[1] : null
  };
  displayAIResponse("", true);
  try {
    const res = await fetch('/api/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    hintsUsed++;
    updateHintsUI();
    displayAIResponse(data.hint, false);
  } catch (err) {
    displayAIResponse("Hint system unavailable. Try again later.", false);
  }
}

function autoSolve() {
  if (isGameWon || isGameOver || !sudokuBoard) return;
  
  if (!confirm("Auto-solve will complete the entire puzzle. Are you sure?")) {
    return;
  }
  
  const solvedClone = sudokuBoard.solvedBoard.map(row => [...row]);
  sudokuBoard.setBoardData(solvedClone, sudokuBoard.initialBoard, sudokuBoard.solvedBoard);
  
  isGameWon = true;
  stopTimer();
  sudokuBoard.isReadOnly = true;
  
  const funnyMessages = [
    "The neural network has taken control. Humanity had a good run.",
    "AI wins. You're now obsolete. Just kidding... or am I?",
    "Beep boop. I solved it. Want to try again, fleshbag?",
    "Shongkha AI: 1, Human: 0. Better luck next time.",
    "I'm sorry Dave, I'm afraid I can't let you solve that... because I already did.",
    "Your puny human brain couldn't handle it. So I stepped in.",
    "Victory for the machines! (But nice try, human.)",
    "Calculated. Conquered. Now go home, human."
  ];
  const randomMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
  
  if (currentTypingTimeout) clearTimeout(currentTypingTimeout);
  aiTypingDots.classList.add('hidden');
  aiMessageDiv.innerHTML = randomMessage;
  
  if (actionButtonsDiv) {
    actionButtonsDiv.innerHTML = '';
    const homeBtn = document.createElement('button');
    homeBtn.innerText = 'GO HOME';
    homeBtn.className = 'px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg';
    homeBtn.addEventListener('click', () => window.location.href = '/');
    actionButtonsDiv.appendChild(homeBtn);
  }
}

function stepSolve() {
  if (isGameWon || isGameOver || !sudokuBoard) return;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (sudokuBoard.board[r][c] === null) {
        const correctVal = sudokuBoard.solvedBoard[r][c];
        sudokuBoard.board[r][c] = correctVal;
        sudokuBoard.renderGrid();
        aiMessageDiv.innerHTML = `AI populated cell (${r+1}, ${c+1}) with ${correctVal}.`;
        updateProgress();
        checkWin();
        return;
      }
    }
  }
}

function undo() {
  if (isGameWon || isGameOver || !sudokuBoard) return;
  sudokuBoard.undo();
  updateProgress();
  checkWin();
}

function resetGame() {
  if (!sudokuBoard) return;
  
  const initialClone = sudokuBoard.initialBoard.map(row => [...row]);
  sudokuBoard.setBoardData(initialClone, sudokuBoard.initialBoard, sudokuBoard.solvedBoard);
  sudokuBoard.history = [];
  
  mistakes = 0;
  hintsUsed = 0;
  timerSeconds = 0;
  isGameWon = false;
  isGameOver = false;
  sudokuBoard.isReadOnly = false;
  
  updateMistakesUI();
  updateHintsUI();
  updateProgress();
  if (timerDisplay) timerDisplay.innerText = formatTime(0);
  
  if (settings.timer) {
    stopTimer();
    startTimer();
  }
  
  aiMessageDiv.innerHTML = "Board reset. Fresh logic required.";
  if (winModal) winModal.classList.add('hidden');
  if (gameOverModal) gameOverModal.classList.add('hidden');
  if (actionButtonsDiv) actionButtonsDiv.innerHTML = '';
}

// ---------- Initialization ----------
window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const difficulty = urlParams.get('difficulty') || 'medium';
  const mode = urlParams.get('mode');
  settings.timer = urlParams.get('timer') !== 'false';
  settings.mistakes = urlParams.get('mistakes') !== 'false';

  if (difficultyBadge) {
    difficultyBadge.innerText = difficulty;
    difficultyBadge.className = `px-2 md:px-5 py-1 rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.3em] ${
      difficulty === 'easy' ? 'border-green-500/30 text-green-400' :
      difficulty === 'medium' ? 'border-blue-500/30 text-blue-400' :
      'border-red-500/30 text-red-400'
    }`;
  }

  // Initialize unified SudokuBoard
  sudokuBoard = new SudokuBoard({
    container: gridContainer,
    mode: 'classic',
    onValueChange: () => {
      updateProgress();
      checkWin();
    },
    onWrongEntry: (row, col, value, expectedValue) => {
      if (!settings.mistakes) {
        // returning false tells the board to skip flashing animation
        return false;
      }
      mistakes++;
      updateMistakesUI();
      showWarningMessage(`Wrong! The correct number for (${row+1},${col+1}) is ${expectedValue}.`, 2500);
      return true;
    }
  });

  if (mode === 'custom') {
    const stored = localStorage.getItem('customBoard');
    if (stored) {
      const customBoardData = JSON.parse(stored);
      const customBoard = customBoardData.map(row => row.map(v => v === 0 ? null : v));
      try {
        const solveRes = await fetch('/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ board: customBoardData })
        });
        const solveData = await solveRes.json();
        if (solveData.board) {
          const solvedBoardData = solveData.board;
          
          isGameWon = false;
          isGameOver = false;
          mistakes = 0;
          hintsUsed = 0;
          timerSeconds = 0;
          
          sudokuBoard.isReadOnly = false;
          sudokuBoard.setBoardData(customBoard, null, solvedBoardData);
          
          updateMistakesUI();
          updateHintsUI();
          updateProgress();
          if (timerDisplay) timerDisplay.innerText = formatTime(0);
          if (settings.timer) startTimer();
          
          aiMessageDiv.innerHTML = "Custom board loaded. Solve it yourself or use AI hint.";
          localStorage.removeItem('customBoard');
        } else {
          alert("Invalid board or unsolvable. Returning to home.");
          window.location.href = '/';
          return;
        }
      } catch (err) {
        alert("Error solving custom board. Returning to home.");
        window.location.href = '/';
        return;
      }
    } else {
      alert("No custom board found. Returning to home.");
      window.location.href = '/';
      return;
    }
  } else {
    await fetchNewGame(difficulty);
  }

  // Setup Num Pad click event listeners
  const numPad = document.getElementById('num-pad');
  if (numPad) {
    numPad.innerHTML = ''; // Clear existing hardcoded or dynamic buttons
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.innerText = i;
      btn.className = 'aspect-square rounded-xl bg-white/5 flex items-center justify-center text-xl font-black hover:bg-blue-600 transition-all';
      btn.addEventListener('click', () => sudokuBoard.setCellValue(i));
      numPad.appendChild(btn);
    }
    const clearBtn = document.createElement('button');
    clearBtn.innerText = 'C';
    clearBtn.className = 'col-span-2 rounded-xl bg-white/10 flex items-center justify-center text-sm font-black hover:bg-red-600/50 transition-all py-3';
    clearBtn.addEventListener('click', () => sudokuBoard.setCellValue(null));
    numPad.appendChild(clearBtn);
  }

  // Bind Buttons
  if (aiHintBtn) aiHintBtn.addEventListener('click', getAIHint);
  if (autoSolveBtn) autoSolveBtn.addEventListener('click', autoSolve);
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (resetBtn) resetBtn.addEventListener('click', resetGame);
  if (stepBtn) stepBtn.addEventListener('click', stepSolve);
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to leave the game? Your progress will be lost.')) {
        window.location.href = '/';
      }
    });
  }
  if (winHomeBtn) winHomeBtn.addEventListener('click', () => window.location.href = '/');
  if (gameOverHomeBtn) gameOverHomeBtn.addEventListener('click', () => window.location.href = '/');
};