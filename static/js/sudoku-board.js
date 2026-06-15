class SudokuBoard {
  constructor({
    container,
    mode = 'classic', // 'classic', 'versus', 'custom'
    onSelect = null,
    onValueChange = null,
    onWrongEntry = null,
    onConflictDetected = null,
    isReadOnly = false
  }) {
    this.container = container;
    this.mode = mode;
    this.onSelect = onSelect;
    this.onValueChange = onValueChange;
    this.onWrongEntry = onWrongEntry;
    this.onConflictDetected = onConflictDetected;
    this.isReadOnly = isReadOnly;

    this.board = Array(9).fill().map(() => Array(9).fill(null));
    this.initialBoard = Array(9).fill().map(() => Array(9).fill(null));
    this.solvedBoard = Array(9).fill().map(() => Array(9).fill(null));
    this.selectedCell = null;
    this.isLocked = false;
    this.history = [];

    this.handleKeydown = this.handleKeydown.bind(this);
    this.initEvents();
  }

  initEvents() {
    window.addEventListener('keydown', this.handleKeydown);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeydown);
  }

  setBoardData(board, initial = null, solved = null) {
    this.board = board.map(row => row.map(v => v === 0 ? null : v));
    if (initial) {
      this.initialBoard = initial.map(row => row.map(v => v === 0 ? null : v));
    } else {
      this.initialBoard = Array(9).fill().map(() => Array(9).fill(null));
    }
    if (solved) {
      this.solvedBoard = solved.map(row => row.map(v => v === 0 ? null : v));
    } else {
      this.solvedBoard = Array(9).fill().map(() => Array(9).fill(null));
    }
    this.renderGrid();
  }

  getBoardData() {
    return this.board.map(row => row.map(v => v === null ? 0 : v));
  }

  getConflicts() {
    const conflicts = new Set();
    
    // Row conflicts
    for (let r = 0; r < 9; r++) {
      const seen = {};
      for (let c = 0; c < 9; c++) {
        const val = this.board[r][c];
        if (val !== null) {
          if (!seen[val]) seen[val] = [];
          seen[val].push(c);
        }
      }
      for (const val in seen) {
        if (seen[val].length > 1) {
          seen[val].forEach(c => conflicts.add(`${r},${c}`));
        }
      }
    }

    // Col conflicts
    for (let c = 0; c < 9; c++) {
      const seen = {};
      for (let r = 0; r < 9; r++) {
        const val = this.board[r][c];
        if (val !== null) {
          if (!seen[val]) seen[val] = [];
          seen[val].push(r);
        }
      }
      for (const val in seen) {
        if (seen[val].length > 1) {
          seen[val].forEach(r => conflicts.add(`${r},${c}`));
        }
      }
    }

    // 3x3 Box conflicts
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = {};
        for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
          for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
            const val = this.board[r][c];
            if (val !== null) {
              if (!seen[val]) seen[val] = [];
              seen[val].push([r, c]);
            }
          }
        }
        for (const val in seen) {
          if (seen[val].length > 1) {
            seen[val].forEach(([r, c]) => conflicts.add(`${r},${c}`));
          }
        }
      }
    }

    return conflicts;
  }

  renderGrid() {
    if (!this.container) return;
    this.container.innerHTML = '';
    
    const conflicts = this.mode === 'custom' ? this.getConflicts() : new Set();

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const value = this.board[r][c];
        const isInitial = this.initialBoard[r][c] !== null;
        const isSelected = this.selectedCell && this.selectedCell[0] === r && this.selectedCell[1] === c;
        
        const isSameRegion = () => {
          if (!this.selectedCell) return false;
          const [sr, sc] = this.selectedCell;
          if (r === sr || c === sc) return true;
          return Math.floor(r/3) === Math.floor(sr/3) && Math.floor(c/3) === Math.floor(sc/3);
        };
        const related = isSameRegion();
        const isConflict = conflicts.has(`${r},${c}`);

        const cell = document.createElement('button');
        
        let cellClass = `relative flex items-center justify-center text-xl md:text-2xl font-bold transition-all duration-200 aspect-square
          ${(r+1) % 3 === 0 && r !== 8 ? 'border-b-[3px] border-blue-600' : 'border-b border-white/10'}
          ${(c+1) % 3 === 0 && c !== 8 ? 'border-r-[3px] border-blue-600' : 'border-r border-white/10'}
          hover:bg-blue-500/10`;

        if (isSelected) {
          cellClass += ' bg-blue-500/25 border-2 border-blue-400 z-10 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-white';
        } else if (isConflict) {
          cellClass += ' bg-red-500/20 text-red-400 z-10 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
        } else if (related) {
          cellClass += ' bg-blue-500/5 text-blue-200/40';
        } else {
          cellClass += ' bg-transparent text-slate-300';
        }

        if (isInitial) {
          cellClass += ' bg-white/2 cursor-default';
        } else {
          cellClass += ' font-medium';
        }

        cell.className = cellClass;

        const span = document.createElement('span');
        if (value !== null) {
          span.innerText = value;
          span.className = isInitial ? 'text-white/90' : 'text-blue-400 font-mono';
        }
        cell.appendChild(span);
        
        if (!this.isReadOnly) {
          cell.addEventListener('click', () => this.selectCell(r, c));
        }
        this.container.appendChild(cell);
      }
    }
  }

  selectCell(row, col) {
    if (this.isLocked || this.isReadOnly) return;
    this.selectedCell = [row, col];
    this.renderGrid();
    if (this.onSelect) {
      this.onSelect(row, col);
    }
  }

  moveToNextEmptyCell() {
    if (!this.selectedCell) return;
    let [startRow, startCol] = this.selectedCell;
    let startIndex = startRow * 9 + startCol;
    for (let i = 1; i <= 81; i++) {
      let index = (startIndex + i) % 81;
      let r = Math.floor(index / 9);
      let c = index % 9;
      if (this.board[r][c] === null && this.initialBoard[r][c] === null) {
        this.selectedCell = [r, c];
        this.renderGrid();
        return;
      }
    }
  }

  flashWrongCell(row, col, wrongValue, onComplete) {
    const cellIndex = row * 9 + col;
    const cellElement = this.container.children[cellIndex];
    if (!cellElement) return;
    const originalSpan = cellElement.querySelector('span');
    if (originalSpan) {
      originalSpan.innerText = wrongValue;
      originalSpan.className = 'text-red-500 font-bold animate-shake';
      cellElement.classList.add('bg-red-500/30');
    }
    this.isLocked = true;
    setTimeout(() => {
      this.board[row][col] = null;
      this.isLocked = false;
      this.renderGrid();
      if (onComplete) onComplete();
    }, 400);
  }

  setCellValue(value) {
    if (this.isLocked || this.isReadOnly) return;
    if (!this.selectedCell) return;
    const [r, c] = this.selectedCell;
    
    // Initial cells can never be overwritten in classic/versus
    if (this.initialBoard[r][c] !== null) return;
    if (this.board[r][c] === value) return;
    
    // Save current state to history
    this.history.push(this.board.map(row => [...row]));
    
    if (this.mode === 'custom') {
      this.board[r][c] = value;
      this.renderGrid();
      if (this.onValueChange) {
        this.onValueChange(r, c, value);
      }
      
      const conflicts = this.getConflicts();
      if (this.onConflictDetected) {
        this.onConflictDetected(conflicts);
      }
      return;
    }

    if (value === null) {
      this.board[r][c] = null;
      this.renderGrid();
      if (this.onValueChange) {
        this.onValueChange(r, c, null);
      }
      return;
    }

    // Check solution
    if (value === this.solvedBoard[r][c]) {
      this.board[r][c] = value;
      this.renderGrid();
      if (this.onValueChange) {
        this.onValueChange(r, c, value);
      }
      this.moveToNextEmptyCell();
    } else {
      let shouldFlash = true;
      if (this.onWrongEntry) {
        shouldFlash = this.onWrongEntry(r, c, value, this.solvedBoard[r][c]);
      }
      if (shouldFlash !== false) {
        this.flashWrongCell(r, c, value);
      } else {
        this.board[r][c] = null;
        this.renderGrid();
      }
    }
  }

  handleKeydown(e) {
    if (this.isLocked || this.isReadOnly) return;
    
    if (e.key >= '1' && e.key <= '9') {
      this.setCellValue(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      this.setCellValue(null);
    } else if (this.selectedCell) {
      let [r, c] = this.selectedCell;
      let moved = false;
      
      if (e.key === 'ArrowUp') {
        r = Math.max(0, r - 1);
        moved = true;
      } else if (e.key === 'ArrowDown') {
        r = Math.min(8, r + 1);
        moved = true;
      } else if (e.key === 'ArrowLeft') {
        c = Math.max(0, c - 1);
        moved = true;
      } else if (e.key === 'ArrowRight') {
        c = Math.min(8, c + 1);
        moved = true;
      }
      
      if (moved) {
        this.selectedCell = [r, c];
        this.renderGrid();
        if (this.onSelect) {
          this.onSelect(r, c);
        }
      }
    }
  }

  undo() {
    if (this.isLocked || this.isReadOnly) return;
    if (this.history.length === 0) return;
    const last = this.history.pop();
    this.board = last.map(row => [...row]);
    this.renderGrid();
    if (this.onValueChange) {
      this.onValueChange();
    }
  }
}
