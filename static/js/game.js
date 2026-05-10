let board = [];
let selectedCell = null;
let fixedCells = [];

// Load board from Flask
async function loadBoard() {
  const urlParams = new URLSearchParams(window.location.search);
  const difficulty = urlParams.get("difficulty") || "medium";

  // Update the UI text for difficulty
  document.getElementById("difficultyText").innerText = difficulty;

  const res = await fetch(`/generate?difficulty=${difficulty}`);
  const data = await res.json();

  board = data.board;

  // mark fixed cells (non-zero from backend)
  fixedCells = board.map(row => row.map(val => val !== 0));

  renderBoard();
}

// Render grid
function renderBoard() {
  const container = document.getElementById("board");
  container.innerHTML = "";

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {

      const cell = document.createElement("div");
      const value = board[r][c];

      const isFixed = fixedCells[r][c];
      const isSelected =
        selectedCell &&
        selectedCell[0] === r &&
        selectedCell[1] === c;

      // Add thicker borders for 3x3 subgrids
      let thickBorders = "";
      if (c % 3 === 2 && c !== 8) thickBorders += " border-r-blue-500 border-r-2";
      if (r % 3 === 2 && r !== 8) thickBorders += " border-b-blue-500 border-b-2";

      cell.className = `
        flex items-center justify-center
        border border-white/10 ${thickBorders}
        text-xl font-bold
        aspect-square
        cursor-pointer
        transition-colors
        ${isFixed ? "text-blue-400" : "text-white"}
        ${isSelected ? "bg-blue-600/40" : "hover:bg-white/5"}
      `;

      cell.innerText = value === 0 ? "" : value;

      cell.onclick = () => selectCell(r, c);

      container.appendChild(cell);
    }
  }
}

// Cell selection
function selectCell(r, c) {
  selectedCell = [r, c];
  renderBoard();
}

// Keyboard input
document.addEventListener("keydown", (e) => {
  if (!selectedCell) return;

  const [r, c] = selectedCell;

  // number input 1-9
  if (e.key >= "1" && e.key <= "9") {
    if (!fixedCells[r][c]) {
      board[r][c] = parseInt(e.key);
      renderBoard();
    }
  }

  // delete / backspace
  if (e.key === "Backspace" || e.key === "Delete") {
    if (!fixedCells[r][c]) {
      board[r][c] = 0;
      renderBoard();
    }
  }

  // Arrow key navigation
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault(); // Stop page scrolling
    let newR = r;
    let newC = c;

    if (e.key === "ArrowUp") newR = Math.max(0, r - 1);
    if (e.key === "ArrowDown") newR = Math.min(8, r + 1);
    if (e.key === "ArrowLeft") newC = Math.max(0, c - 1);
    if (e.key === "ArrowRight") newC = Math.min(8, c + 1);

    selectCell(newR, newC);
  }
});

// Auto Solve functionality
async function autoSolve() {
  try {
    const res = await fetch('/solve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ board: board })
    });
    
    const data = await res.json();
    
    if (data.board) {
      board = data.board;
      selectedCell = null; // Clear selection
      renderBoard();
    } else {
      alert("Could not solve the board. Are there mistakes?");
    }
  } catch (err) {
    console.error("Error solving:", err);
  }
}

// Load on start
window.onload = loadBoard;