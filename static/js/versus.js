// DOM Elements
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
let sudokuBoard = null;
let mistakes = 0;
let hintsUsed = 0;
let timerSeconds = 0;
let timerInterval = null;
let isFinished = false;
let playerName = 'Player ' + player;

function calculateCurrentPenalty() {
  const empty = countEmptyCells();
  let score = timerSeconds + (mistakes * 10);
  score += (hintsUsed ** 1.5) * 10;
  score += empty * 35;
  return Math.round(score);
}

function countEmptyCells() {
  if (!sudokuBoard) return 81;
  let count = 0;
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (sudokuBoard.board[i][j] === null && sudokuBoard.initialBoard[i][j] === null) {
        count++;
      }
    }
  }
  return count;
}

function updatePenaltiesUI() {
  if (unsolvedSpan) unsolvedSpan.innerText = countEmptyCells();
  if (currentPenaltySpan) currentPenaltySpan.innerText = calculateCurrentPenalty();
}

function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${mins}:${remain.toString().padStart(2, '0')}`;
}

function updateMistakesUI() {
  if (mistakesSpan) mistakesSpan.innerText = mistakes;
}

function updateHintsUI() {
  if (hintsSpan) hintsSpan.innerText = hintsUsed;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Check if player finished their game (turn is finished)
function startTimer() {
  if (isFinished) return;
  if (timerInterval) stopTimer();
  timerInterval = setInterval(() => {
    if (!isFinished) {
      timerSeconds++;
      if (timerDisplay) timerDisplay.innerText = formatTime(timerSeconds);
      if (currentPenaltySpan) currentPenaltySpan.innerText = calculateCurrentPenalty();
    }
  }, 1000);
}

async function finishTurn() {
  if (isFinished || !sudokuBoard) return;
  isFinished = true;
  stopTimer();
  sudokuBoard.isReadOnly = true;
  
  const empty = countEmptyCells();
  const emptyPenalty = empty * 35;
  if (!confirm(`Finish your turn?\nTime: ${formatTime(timerSeconds)}\nMistakes: ${mistakes}\nHints: ${hintsUsed}\nEmpty cells: ${empty}\nEmpty cell penalty: +${emptyPenalty}\n\nSubmit?`)) {
    isFinished = false;
    sudokuBoard.isReadOnly = false;
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
      empty_cells: empty
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
    isFinished = false;
    sudokuBoard.isReadOnly = false;
    startTimer();
  }
}

async function getAIHint() {
  if (isFinished || !sudokuBoard) return;
  const payload = {
    board: sudokuBoard.getBoardData(),
    row: sudokuBoard.selectedCell ? sudokuBoard.selectedCell[0] : null,
    col: sudokuBoard.selectedCell ? sudokuBoard.selectedCell[1] : null
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
  if (isFinished || !sudokuBoard) return;
  sudokuBoard.undo();
  updatePenaltiesUI();
}

function resetGame() {
  if (isFinished || !sudokuBoard) return;
  
  const initialClone = sudokuBoard.initialBoard.map(row => [...row]);
  sudokuBoard.setBoardData(initialClone, sudokuBoard.initialBoard, sudokuBoard.solvedBoard);
  sudokuBoard.history = [];
  
  mistakes = 0;
  hintsUsed = 0;
  updateMistakesUI();
  updateHintsUI();
  updatePenaltiesUI();
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
  if (opponentNameSpan) opponentNameSpan.innerText = opponentName;
  
  const opponentFinished = data[`player${opponentNum}_finished`];
  if (opponentFinished) {
    if (opponentStatusSpan) opponentStatusSpan.innerText = 'Completed';
    if (opponentMistakesSpan) opponentMistakesSpan.innerText = data[`player${opponentNum}_mistakes`];
    if (opponentHintsSpan) opponentHintsSpan.innerText = data[`player${opponentNum}_hints`];
    if (opponentEmptySpan) opponentEmptySpan.innerText = data[`player${opponentNum}_empty`];
    const opponentPenalty = data[`player${opponentNum}_score`];
    if (opponentPenaltySpan) opponentPenaltySpan.innerText = opponentPenalty !== null ? opponentPenalty : '?';
  } else {
    if (opponentStatusSpan) opponentStatusSpan.innerText = 'Solving...';
    if (opponentMistakesSpan) opponentMistakesSpan.innerText = '-';
    if (opponentHintsSpan) opponentHintsSpan.innerText = '-';
    if (opponentEmptySpan) opponentEmptySpan.innerText = '-';
    if (opponentPenaltySpan) opponentPenaltySpan.innerText = '-';
  }
  
  if (!isMyTurn && !opponentFinished) {
    alert(`It's not your turn! Waiting for Player ${currentTurn}.`);
    submitBtn.disabled = true;
    aiHintBtn.disabled = true;
    undoBtn.disabled = true;
    resetBtn.disabled = true;
    if (turnIndicator) turnIndicator.innerText = `Waiting for Player ${currentTurn}`;
    sudokuBoard.isReadOnly = true;
  } else {
    submitBtn.disabled = false;
    aiHintBtn.disabled = false;
    undoBtn.disabled = false;
    resetBtn.disabled = false;
    if (turnIndicator) turnIndicator.innerText = `Your Turn (${playerName})`;
    sudokuBoard.isReadOnly = false;
  }
  
  if (currentPlayerNameSpan) currentPlayerNameSpan.innerText = data[`player${player}_name`];
  
  sudokuBoard.setBoardData(data.initial, data.initial, data.solved);
  
  mistakes = 0;
  hintsUsed = 0;
  timerSeconds = 0;
  isFinished = false;
  
  updateMistakesUI();
  updateHintsUI();
  updatePenaltiesUI();
  startTimer();
}

window.onload = () => {
  // Initialize Board
  sudokuBoard = new SudokuBoard({
    container: gridContainer,
    mode: 'versus',
    onValueChange: () => {
      updatePenaltiesUI();
    },
    onWrongEntry: (row, col, value, expectedValue) => {
      mistakes++;
      updateMistakesUI();
      aiMessageDiv.innerHTML = `Wrong! The correct number for (${row+1},${col+1}) is ${expectedValue}.`;
      return true;
    }
  });

  // Build number pad
  const pad = document.getElementById('num-pad');
  if (pad) {
    pad.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
      const btn = document.createElement('button');
      btn.innerText = i;
      btn.className = 'aspect-square rounded-xl bg-white/5 flex items-center justify-center text-xl font-black hover:bg-blue-600 transition-all';
      btn.addEventListener('click', () => sudokuBoard.setCellValue(i));
      pad.appendChild(btn);
    }
    const clearBtn = document.createElement('button');
    clearBtn.innerText = 'C';
    clearBtn.className = 'col-span-2 rounded-xl bg-white/10 flex items-center justify-center text-sm font-black hover:bg-red-600/50 transition-all py-3';
    clearBtn.addEventListener('click', () => sudokuBoard.setCellValue(null));
    pad.appendChild(clearBtn);
  }

  // Load backend state
  loadGameState();

  // Bind Buttons
  if (aiHintBtn) aiHintBtn.addEventListener('click', getAIHint);
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (resetBtn) resetBtn.addEventListener('click', resetGame);
  if (submitBtn) submitBtn.addEventListener('click', finishTurn);
  if (winnerHomeBtn) winnerHomeBtn.addEventListener('click', () => window.location.href = '/');
  
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to leave the versus game? Your progress will be lost.')) {
        window.location.href = '/';
      }
    });
  }
};