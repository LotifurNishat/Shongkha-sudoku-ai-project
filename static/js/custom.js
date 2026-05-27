// ---------- DOM Elements ----------
const gridContainer = document.getElementById('custom-grid');
const solveBtn = document.getElementById('solve-btn');
const playBtn = document.getElementById('play-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// ---------- Board State ----------
let board = Array(9).fill().map(() => Array(9).fill(null)); // 9x9 with null
let selectedCell = null;

// ---------- Helper Functions ----------
function renderGrid() {
  gridContainer.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = board[r][c];
      const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
      
      const cell = document.createElement('button');
      cell.className = `relative flex items-center justify-center text-xl md:text-2xl font-bold transition-all duration-200 aspect-square
        ${(r+1) % 3 === 0 && r !== 8 ? 'border-b-[3px] border-blue-600' : 'border-b border-white/10'}
        ${(c+1) % 3 === 0 && c !== 8 ? 'border-r-[3px] border-blue-600' : 'border-r border-white/10'}
        ${isSelected ? 'bg-blue-500/25 border-2 border-blue-400 z-10 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-white' : 'bg-transparent text-slate-300 hover:bg-blue-500/10'}
      `;
      
      const span = document.createElement('span');
      if (value !== null) {
        span.innerText = value;
        span.className = 'text-blue-400 font-mono';
      }
      cell.appendChild(span);
      cell.addEventListener('click', () => selectCell(r, c));
      gridContainer.appendChild(cell);
    }
  }
}

function selectCell(row, col) {
  selectedCell = [row, col];
  renderGrid();
}

function setCellValue(value) {
  if (!selectedCell) return;
  const [r, c] = selectedCell;
  board[r][c] = value === null ? null : value;
  renderGrid();
}

// ---------- Keyboard Support ----------
function handleKeydown(e) {
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

// ---------- API Calls ----------
async function solveBoard() {
  // Convert board (null -> 0) for backend
  const payload = board.map(row => row.map(v => v === null ? 0 : v));
  try {
    const res = await fetch('/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: payload })
    });
    const data = await res.json();
    if (data.board) {
      // Convert 0 back to null
      board = data.board.map(row => row.map(v => v === 0 ? null : v));
      renderGrid();
      alert("Board solved!");
    } else {
      alert("Could not solve this board. It might be invalid or unsolvable.");
    }
  } catch (err) {
    alert("Error solving board. Check console.");
  }
}

function playThisBoard() {
  // Check if board is non-empty? No need, empty is allowed (player will fill)
  // Save board to localStorage (convert null to 0 for storage simplicity)
  const boardToStore = board.map(row => row.map(v => v === null ? 0 : v));
  localStorage.setItem('customBoard', JSON.stringify(boardToStore));
  // Redirect to game in custom mode
  window.location.href = '/game?mode=custom';
}

function clearAll() {
  board = Array(9).fill().map(() => Array(9).fill(null));
  selectedCell = null;
  renderGrid();
}

// ---------- Build Number Pad ----------
function buildNumPad() {
  const pad = document.getElementById('num-pad-custom');
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

// ---------- Initialization ----------
window.onload = () => {
  renderGrid();
  buildNumPad();
  window.addEventListener('keydown', handleKeydown);
  solveBtn.addEventListener('click', solveBoard);
  playBtn.addEventListener('click', playThisBoard);
  clearAllBtn.addEventListener('click', clearAll);
};