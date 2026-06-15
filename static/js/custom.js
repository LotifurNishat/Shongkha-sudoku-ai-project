// ---------- DOM Elements ----------
const gridContainer = document.getElementById('custom-grid');
const solveBtn = document.getElementById('solve-btn');
const playBtn = document.getElementById('play-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const infoParagraph = document.querySelector('.glass p.text-slate-500');

// ---------- Board State ----------
let sudokuBoard = null;
const defaultInfoText = "Click on any cell and press a number key (1-9) or use the pad below. Press Delete/Backspace to clear.";

// ---------- API Calls ----------
async function solveBoard() {
  if (!sudokuBoard) return;
  
  const payload = sudokuBoard.getBoardData();
  try {
    const res = await fetch('/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ board: payload })
    });
    const data = await res.json();
    if (data.board) {
      // Set board data (no initial locks, solved is data.board)
      sudokuBoard.setBoardData(data.board, null, data.board);
      alert("Board solved!");
    } else {
      alert("Could not solve this board. It might be invalid or unsolvable.");
    }
  } catch (err) {
    alert("Error solving board. Check console.");
  }
}

function playThisBoard() {
  if (!sudokuBoard) return;
  
  const conflicts = sudokuBoard.getConflicts();
  if (conflicts.size > 0) {
    alert("Cannot play board: Please resolve duplicate values first.");
    return;
  }
  
  const boardToStore = sudokuBoard.getBoardData();
  localStorage.setItem('customBoard', JSON.stringify(boardToStore));
  window.location.href = '/game?mode=custom';
}

function clearAll() {
  if (!sudokuBoard) return;
  const emptyBoard = Array(9).fill().map(() => Array(9).fill(null));
  sudokuBoard.setBoardData(emptyBoard);
  sudokuBoard.history = [];
  if (infoParagraph) {
    infoParagraph.innerHTML = defaultInfoText;
    infoParagraph.className = "text-slate-500 mb-6 text-sm";
  }
}

// ---------- Build Number Pad ----------
function buildNumPad() {
  const pad = document.getElementById('num-pad-custom');
  if (!pad) return;
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

// ---------- Initialization ----------
window.onload = () => {
  // Instantiate board in custom creator mode
  sudokuBoard = new SudokuBoard({
    container: gridContainer,
    mode: 'custom',
    onConflictDetected: (conflicts) => {
      if (infoParagraph) {
        if (conflicts.size > 0) {
          infoParagraph.innerHTML = '<span class="text-red-500 font-bold">Warning: Duplicate number detected in row/column/box!</span>';
          infoParagraph.className = "mb-6 text-sm animate-pulse";
        } else {
          infoParagraph.innerHTML = defaultInfoText;
          infoParagraph.className = "text-slate-500 mb-6 text-sm";
        }
      }
    }
  });

  // Render initial blank board
  const emptyBoard = Array(9).fill().map(() => Array(9).fill(null));
  sudokuBoard.setBoardData(emptyBoard);

  buildNumPad();

  if (solveBtn) solveBtn.addEventListener('click', solveBoard);
  if (playBtn) playBtn.addEventListener('click', playThisBoard);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAll);
};