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
let board = [];
let initialBoard = [];
let solvedBoard = [];
let selectedCell = null;
let history = [];
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
  const filled = board.flat().filter(cell => cell !== null).length;
  const percent = Math.round((filled / 81) * 100);
  progressPercent.innerText = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

function updateMistakesUI() {
  mistakesSpan.innerText = mistakes;
  if (settings.mistakes && mistakes >= 3 && !isGameWon && !isGameOver) {
    isGameOver = true;
    stopTimer();
    gameOverTimeSpan.innerText = formatTime(timerSeconds);
    gameOverHintsSpan.innerText = hintsUsed;
    gameOverModal.classList.remove('hidden');
    gameOverModal.classList.add('flex');
    aiMessageDiv.innerHTML = "GAME OVER: Too many mistakes.";
  }
}

function updateHintsUI() {
  hintsSpan.innerText = hintsUsed.toString().padStart(2, '0');
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
      timerDisplay.innerText = formatTime(timerSeconds);
    }
  }, 1000);
}

function checkWin() {
  if (isGameWon || isGameOver) return false;
  let allMatch = true;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== solvedBoard[i][j]) {
        allMatch = false;
        break;
      }
    }
  }
  if (allMatch) {
    isGameWon = true;
    stopTimer();
    winTimeSpan.innerText = formatTime(timerSeconds);
    winHintsSpan.innerText = hintsUsed;
    winModal.classList.remove('hidden');
    winModal.classList.add('flex');
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

// Auto‑advance to the next empty cell (skipping fixed cells)
function moveToNextEmptyCell() {
  if (!selectedCell) return;
  let [startRow, startCol] = selectedCell;
  let startIndex = startRow * 9 + startCol;
  for (let i = 1; i <= 81; i++) {
    let index = (startIndex + i) % 81;
    let r = Math.floor(index / 9);
    let c = index % 9;
    if (board[r][c] === null && initialBoard[r][c] === null) {
      selectedCell = [r, c];
      renderGrid();
      return;
    }
  }
  // No empty cell found; board may be full. Check win will handle.
}

function flashWrongCell(row, col, wrongValue, onComplete) {
  const cellIndex = row * 9 + col;
  const cellElement = gridContainer.children[cellIndex];
  if (!cellElement) return;
  const originalSpan = cellElement.querySelector('span');
  if (originalSpan) {
    originalSpan.innerText = wrongValue;
    originalSpan.className = 'text-red-500 font-bold animate-shake';
    cellElement.classList.add('bg-red-500/30');
  }
  setTimeout(() => {
    board[row][col] = null;
    renderGrid();
    if (onComplete) onComplete();
  }, 400);
}

function handleWrongEntry(row, col, wrongValue) {
  if (!settings.mistakes) {
    board[row][col] = null;
    renderGrid();
    // Do NOT advance on wrong entry
    return;
  }
  mistakes++;
  updateMistakesUI();
  showWarningMessage(`Wrong! The correct number for (${row+1},${col+1}) is ${solvedBoard[row][col]}.`, 2500);
  flashWrongCell(row, col, wrongValue, () => {
    // After clearing wrong number, do NOT advance
  });
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
  board = data.board.map(row => row.map(v => v === 0 ? null : v));
  initialBoard = data.initial.map(row => row.map(v => v === 0 ? null : v));
  solvedBoard = data.solved.map(row => row.map(v => v === 0 ? null : v));
  history = [];
  mistakes = 0;
  hintsUsed = 0;
  timerSeconds = 0;
  isGameWon = false;
  isGameOver = false;
  updateMistakesUI();
  updateHintsUI();
  updateProgress();
  timerDisplay.innerText = formatTime(0);
  if (settings.timer) startTimer();
  else stopTimer();
  renderGrid();
  aiMessageDiv.innerHTML = "Game ready. Click a cell and press a number key.";
  if (actionButtonsDiv) actionButtonsDiv.innerHTML = '';
}

async function getAIHint() {
  if (isGameWon || isGameOver) return;
  const payload = {
    board: board.map(row => row.map(v => v === null ? 0 : v)),
    row: selectedCell ? selectedCell[0] : null,
    col: selectedCell ? selectedCell[1] : null
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
  if (isGameWon || isGameOver) return;
  
  if (!confirm("Auto-solve will complete the entire puzzle. Are you sure?")) {
    return;
  }
  
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      board[i][j] = solvedBoard[i][j];
    }
  }
  renderGrid();
  isGameWon = true;
  stopTimer();
  
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
  if (isGameWon || isGameOver) return;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === null) {
        const correctVal = solvedBoard[r][c];
        board[r][c] = correctVal;
        renderGrid();
        aiMessageDiv.innerHTML = `AI populated cell (${r+1}, ${c+1}) with ${correctVal}.`;
        if (checkWin()) return;
        return;
      }
    }
  }
}

function undo() {
  if (isGameWon || isGameOver) return;
  if (history.length === 0) return;
  const last = history.pop();
  board = last.map(row => [...row]);
  renderGrid();
  checkWin();
}

function resetGame() {
  board = initialBoard.map(row => [...row]);
  history = [];
  mistakes = 0;
  hintsUsed = 0;
  timerSeconds = 0;
  isGameWon = false;
  isGameOver = false;
  updateMistakesUI();
  updateHintsUI();
  timerDisplay.innerText = formatTime(0);
  if (settings.timer) {
    stopTimer();
    startTimer();
  }
  renderGrid();
  aiMessageDiv.innerHTML = "Board reset. Fresh logic required.";
  winModal.classList.add('hidden');
  gameOverModal.classList.add('hidden');
  if (actionButtonsDiv) actionButtonsDiv.innerHTML = '';
}

// ---------- Grid Rendering & Interaction ----------
function renderGrid() {
  gridContainer.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = board[r][c];
      const isInitial = initialBoard[r][c] !== null;
      const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
      const isSameRegion = () => {
        if (!selectedCell) return false;
        const [sr, sc] = selectedCell;
        if (r === sr || c === sc) return true;
        return Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3);
      };
      const related = isSameRegion();
      
      const cell = document.createElement('button');
      cell.className = `relative flex items-center justify-center text-xl md:text-2xl font-bold transition-all duration-200 aspect-square
        ${(r+1) % 3 === 0 && r !== 8 ? 'border-b-[3px] border-blue-600' : 'border-b border-white/10'}
        ${(c+1) % 3 === 0 && c !== 8 ? 'border-r-[3px] border-blue-600' : 'border-r border-white/10'}
        ${isSelected ? 'bg-blue-500/25 border-2 border-blue-400 z-10 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-white' : 
          related ? 'bg-blue-500/5 text-blue-200/40' : 'bg-transparent text-slate-300'}
        ${isInitial ? 'bg-white/2 cursor-default' : 'font-medium'}
        hover:bg-blue-500/10`;
      
      const span = document.createElement('span');
      if (value !== null) {
        span.innerText = value;
        span.className = isInitial ? 'text-white/90' : 'text-blue-400 font-mono';
      }
      cell.appendChild(span);
      cell.addEventListener('click', () => selectCell(r, c));
      gridContainer.appendChild(cell);
    }
  }
  updateProgress();
}

function selectCell(row, col) {
  if (isGameWon || isGameOver) return;
  selectedCell = [row, col];
  renderGrid();
}

function setCellValue(value) {
  if (isGameWon || isGameOver) return;
  if (!selectedCell) return;
  const [r, c] = selectedCell;
  if (initialBoard[r][c] !== null) return;
  if (board[r][c] === value) return;
  history.push(board.map(row => [...row]));
  if (value === null) {
    board[r][c] = null;
    renderGrid();
    // Do not advance on clear
    return;
  }
  if (value === solvedBoard[r][c]) {
    board[r][c] = value;
    renderGrid();
    checkWin();
    // Only advance if the game is not won
    if (!isGameWon) {
      moveToNextEmptyCell();
    }
  } else {
    handleWrongEntry(r, c, value);
    // No advance on wrong entry
  }
}

// ---------- Keyboard Support ----------
function handleKeydown(e) {
  if (isGameWon || isGameOver) return;
  if (e.key >= '1' && e.key <= '9') {
    setCellValue(parseInt(e.key));
  } else if (e.key === 'Backspace' || e.key === 'Delete') {
    setCellValue(null);
  } else if (selectedCell) {
    let [r, c] = selectedCell;
    if (e.key === 'ArrowUp') r = Math.max(0, r-1);
    if (e.key === 'ArrowDown') r = Math.min(8, r+1);
    if (e.key === 'ArrowLeft') c = Math.max(0, c-1);
    if (e.key === 'ArrowRight') c = Math.min(8, c+1);
    selectedCell = [r, c];
    renderGrid();
  }
}

// ---------- Initialization ----------
window.onload = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const difficulty = urlParams.get('difficulty') || 'medium';
  const mode = urlParams.get('mode');
  settings.timer = urlParams.get('timer') !== 'false';
  settings.mistakes = urlParams.get('mistakes') !== 'false';

  difficultyBadge.innerText = difficulty;
  difficultyBadge.className = `px-2 md:px-5 py-1 rounded-full border text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.3em] ${
    difficulty === 'easy' ? 'border-green-500/30 text-green-400' :
    difficulty === 'medium' ? 'border-blue-500/30 text-blue-400' :
    'border-red-500/30 text-red-400'
  }`;

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
          solvedBoard = solvedBoardData.map(row => row.map(v => v === 0 ? null : v));
          board = customBoard;
          initialBoard = Array(9).fill().map(() => Array(9).fill(null));
          history = [];
          mistakes = 0;
          hintsUsed = 0;
          timerSeconds = 0;
          isGameWon = false;
          isGameOver = false;
          updateMistakesUI();
          updateHintsUI();
          updateProgress();
          timerDisplay.innerText = formatTime(0);
          if (settings.timer) startTimer();
          renderGrid();
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

  window.addEventListener('keydown', handleKeydown);

  menuBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to leave the game? Your progress will be lost.')) {
        window.location.href = '/';
      }
    });
  
  const numPad = document.getElementById('num-pad');
  if (numPad) {
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.innerText = i;
      btn.className = 'aspect-square rounded-xl bg-white/5 flex items-center justify-center text-xl font-black hover:bg-blue-600 transition-all';
      btn.addEventListener('click', () => setCellValue(i));
      numPad.appendChild(btn);
    }
    const clearBtn = document.createElement('button');
    clearBtn.innerText = 'C';
    clearBtn.className = 'col-span-2 rounded-xl bg-white/10 flex items-center justify-center text-sm font-black hover:bg-red-600/50 transition-all py-3';
    clearBtn.addEventListener('click', () => setCellValue(null));
    numPad.appendChild(clearBtn);
    numPad.classList.add('grid-cols-5');
  }
  
  aiHintBtn.addEventListener('click', getAIHint);
  autoSolveBtn.addEventListener('click', autoSolve);
  undoBtn.addEventListener('click', undo);
  resetBtn.addEventListener('click', resetGame);
  stepBtn.addEventListener('click', stepSolve);
  menuBtn.addEventListener('click', () => window.location.href = '/');
  winHomeBtn.addEventListener('click', () => window.location.href = '/');
  gameOverHomeBtn.addEventListener('click', () => window.location.href = '/');
};