// DOM Elements
// Additional DOM elements for opponent stats
const opponentNameSpan = document.getElementById('opponent-name');
const opponentStatusSpan = document.getElementById('opponent-status');
const opponentMistakesSpan = document.getElementById('opponent-mistakes');
const opponentHintsSpan = document.getElementById('opponent-hints');
const opponentEmptySpan = document.getElementById('opponent-empty');
const opponentScoreSpan = document.getElementById('opponent-score');
const gridContainer = document.getElementById('sudoku-grid');
const timerDisplay = document.getElementById('timer-display');
const mistakesSpan = document.getElementById('mistakes-count');
const hintsSpan = document.getElementById('hints-count');
const unsolvedSpan = document.getElementById('unsolved-count');
const aiMessageDiv = document.getElementById('ai-message');
const turnIndicator = document.getElementById('turn-indicator');
const currentPlayerNameSpan = document.getElementById('current-player-name');
const aiHintBtn = document.getElementById('ai-hint-btn');
const undoBtn = document.getElementById('undo-btn');
const resetBtn = document.getElementById('reset-btn');
const submitBtn = document.getElementById('submit-btn');
const winnerModal = document.getElementById('winner-modal');
const winnerIcon = document.getElementById('winner-icon');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');
const scoreDetails = document.getElementById('score-details');
const winnerHomeBtn = document.getElementById('winner-home-btn');
const opponentPenaltySpan = document.getElementById('opponent-penalty');
const currentPenaltySpan = document.getElementById('current-penalty');

// URL params
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('game_id');
const player = urlParams.get('player'); // '1' or '2'

// Game state
let board = [];
let initialBoard = [];
let solvedBoard = [];
let selectedCell = null;
let history = [];
let mistakes = 0;
let hintsUsed = 0;
let timerSeconds = 0;
let timerInterval = null;
let isFinished = false;
let playerName = 'Player ' + player;

function calculateCurrentPenalty() {
  // Only for visual feedback – uses the same formula as backend
  const empty = countEmptyCells();
  let score = timerSeconds + (mistakes * 10);
  score += (hintsUsed ** 1.5) * 10;
  score += empty * 35;
  // Completion bonus not applied because we don't know final completion yet
  return Math.round(score);
}

// Helper: count empty cells (unsolved)
function countEmptyCells() {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (board[i][j] === null && initialBoard[i][j] === null) {
        count++;
      }
    }
  }
  return count;
}

function updatePenaltiesUI() {
  unsolvedSpan.innerText = countEmptyCells();
}

function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${mins}:${remain.toString().padStart(2, '0')}`;
}

function updateMistakesUI() {
  mistakesSpan.innerText = mistakes;
}

function updateHintsUI() {
  hintsSpan.innerText = hintsUsed;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  if (isFinished) return;
  if (timerInterval) stopTimer();
  timerInterval = setInterval(() => {
    if (!isFinished) {
      timerSeconds++;
      timerDisplay.innerText = formatTime(timerSeconds);
    }
  }, 1000);
}

// Auto-advance to next empty cell (skipping fixed and filled)
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
  // no empty cells – board full
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
  mistakes++;
  updateMistakesUI();
  aiMessageDiv.innerHTML = `Wrong! The correct number for (${row+1},${col+1}) is ${solvedBoard[row][col]}.`;
  flashWrongCell(row, col, wrongValue, () => {
    // after clearing, stay on same cell (no auto-advance on wrong)
    renderGrid();
  });
}

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
  updatePenaltiesUI();
  if (currentPenaltySpan) {
    currentPenaltySpan.innerText = calculateCurrentPenalty();
  }
}

function selectCell(row, col) {
  if (isFinished) return;
  selectedCell = [row, col];
  renderGrid();
}

function setCellValue(value) {
  if (isFinished) return;
  if (!selectedCell) return;
  const [r, c] = selectedCell;
  if (initialBoard[r][c] !== null) return;
  if (board[r][c] === value) return;
  history.push(board.map(row => [...row]));
  if (value === null) {
    board[r][c] = null;
    renderGrid();
    return;
  }
  if (value === solvedBoard[r][c]) {
    board[r][c] = value;
    renderGrid();
    // auto-advance to next empty
    moveToNextEmptyCell();
  } else {
    handleWrongEntry(r, c, value);
  }
}

async function finishTurn() {
  if (isFinished) return;
  isFinished = true;
  stopTimer();
  const empty = countEmptyCells();
  const emptyPenalty = empty * 35;
  if (!confirm(`Finish your turn?\nTime: ${formatTime(timerSeconds)}\nMistakes: ${mistakes}\nHints: ${hintsUsed}\nEmpty cells: ${empty}\nEmpty cell penalty: +${emptyPenalty}\n\nSubmit?`)) {
    isFinished = false;
    startTimer();
    return;
  }
  const res = await fetch('/api/versus/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game_id: gameId,
      player: player,
      time: timerSeconds,
      hints: hintsUsed,
      mistakes: mistakes,
      empty_cells: empty   // key must match backend
    })
  });
  const data = await res.json();
  if (data.next_player) {
    alert(`Turn finished! Now it's Player ${data.next_player}'s turn.`);
    window.location.href = `/versus/game?game_id=${gameId}&player=${data.next_player}`;
  } else if (data.winner) {
    showWinnerModal(data);
  } else {
    alert('Error finishing turn.');
  }
}

async function getAIHint() {
  if (isFinished) return;
  const payload = {
    board: board.map(row => row.map(v => v === null ? 0 : v)),
    row: selectedCell ? selectedCell[0] : null,
    col: selectedCell ? selectedCell[1] : null
  };
  try {
    const res = await fetch('/api/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    hintsUsed++;
    updateHintsUI();
    aiMessageDiv.innerHTML = data.hint || "Try looking at the 3x3 blocks.";
  } catch (err) {
    aiMessageDiv.innerHTML = "Hint unavailable.";
  }
}

function undo() {
  if (isFinished) return;
  if (history.length === 0) return;
  const last = history.pop();
  board = last.map(row => [...row]);
  renderGrid();
}

function resetGame() {
  if (isFinished) return;
  board = initialBoard.map(row => [...row]);
  history = [];
  mistakes = 0;
  hintsUsed = 0;
  updateMistakesUI();
  updateHintsUI();
  renderGrid();
  aiMessageDiv.innerHTML = "Board reset. Continue your turn.";
}

function showWinnerModal(data) {
  const isWinner = (data.winner == player);
  if (isWinner) {
    winnerIcon.innerHTML = '<svg class="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>';
    winnerTitle.innerText = 'VICTORY!';
    winnerMessage.innerText = `${data.winner_name} wins with a penalty of ${data.winner == 1 ? data.score1 : data.score2}!`;
  } else {
    winnerIcon.innerHTML = '<svg class="w-16 h-16 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
    winnerTitle.innerText = 'DEFEAT';
    winnerMessage.innerText = `${data.winner_name} wins. Better luck next time!`;
  }
  
  const p1Score = data.score1;
  const p2Score = data.score2;
  const p1Name = data.player1_name;
  const p2Name = data.player2_name;
  scoreDetails.innerHTML = `
    <div class="flex justify-between"><span>${p1Name}:</span><span class="font-mono">${p1Score} penalty</span></div>
    <div class="flex justify-between"><span>${p2Name}:</span><span class="font-mono">${p2Score} penalty</span></div>
    <div class="h-px bg-white/20 my-2"></div>
    <div class="flex justify-between font-bold"><span>Winner (lower penalty):</span><span>${data.winner_name}</span></div>
  `;
  winnerModal.classList.remove('hidden');
  winnerModal.classList.add('flex');
}

async function loadGameState() {
  const res = await fetch(`/api/versus/state?game_id=${gameId}`);
  const data = await res.json();
  const currentTurn = data.current_player;
  const isMyTurn = (currentTurn == player);
  
  // Update opponent info
  const opponentNum = player == '1' ? '2' : '1';
  const opponentName = data[`player${opponentNum}_name`];
  opponentNameSpan.innerText = opponentName;
  
  const opponentFinished = data[`player${opponentNum}_finished`];
    if (opponentFinished) {
    opponentMistakesSpan.innerText = data[`player${opponentNum}_mistakes`];
    opponentHintsSpan.innerText = data[`player${opponentNum}_hints`];
    opponentEmptySpan.innerText = data[`player${opponentNum}_empty`];
    const opponentPenalty = data[`player${opponentNum}_score`];
    opponentPenaltySpan.innerText = opponentPenalty !== null ? opponentPenalty : '?';
  } else {
    opponentMistakesSpan.innerText = '-';
    opponentHintsSpan.innerText = '-';
    opponentEmptySpan.innerText = '-';
    opponentPenaltySpan.innerText = '-';
  }
  
  if (!isMyTurn && !opponentFinished) {
    alert(`It's not your turn! Waiting for Player ${currentTurn}.`);
    submitBtn.disabled = true;
    aiHintBtn.disabled = true;
    undoBtn.disabled = true;
    resetBtn.disabled = true;
    turnIndicator.innerText = `Waiting for Player ${currentTurn}`;
  } else {
    submitBtn.disabled = false;
    aiHintBtn.disabled = false;
    undoBtn.disabled = false;
    resetBtn.disabled = false;
    turnIndicator.innerText = `Your Turn (Player ${player})`;
  }
  
  currentPlayerNameSpan.innerText = data[`player${player}_name`];
  initialBoard = data.initial.map(row => row.map(v => v === 0 ? null : v));
  solvedBoard = data.solved.map(row => row.map(v => v === 0 ? null : v));
  board = initialBoard.map(row => [...row]);
  history = [];
  mistakes = 0;
  hintsUsed = 0;
  timerSeconds = 0;
  isFinished = false;
  updateMistakesUI();
  updateHintsUI();
  renderGrid();
  startTimer();
}

// Build number pad
function buildNumPad() {
  const pad = document.getElementById('num-pad');
  for (let i = 1; i <= 9; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    btn.className = 'aspect-square rounded-xl bg-white/5 flex items-center justify-center text-xl font-black hover:bg-blue-600 transition-all';
    btn.addEventListener('click', () => setCellValue(i));
    pad.appendChild(btn);
  }
  const clearBtn = document.createElement('button');
  clearBtn.innerText = 'C';
  clearBtn.className = 'col-span-2 rounded-xl bg-white/10 flex items-center justify-center text-sm font-black hover:bg-red-600/50 transition-all py-3';
  clearBtn.addEventListener('click', () => setCellValue(null));
  pad.appendChild(clearBtn);
}

// Event listeners
window.onload = () => {
  buildNumPad();
  loadGameState();
  aiHintBtn.addEventListener('click', getAIHint);
  undoBtn.addEventListener('click', undo);
  resetBtn.addEventListener('click', resetGame);
  submitBtn.addEventListener('click', finishTurn);
  winnerHomeBtn.addEventListener('click', () => window.location.href = '/');
  window.addEventListener('keydown', (e) => {
    if (isFinished) return;
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
  });

  const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to leave the versus game? Your progress will be lost.')) {
        window.location.href = '/';
        }
    });
    }
};