import random
from solver.backtracking import solve

def get_hint(board):

    # copy board
    solved_board = [row[:] for row in board]

    # solve copied board
    if solve(solved_board):

        empty_cells = []

        # collect all empty cells
        for i in range(9):
            for j in range(9):
                if board[i][j] == 0:
                    empty_cells.append((i, j))

        # pick random empty cell
        if empty_cells:
            i, j = random.choice(empty_cells)

            return {
                "row": i,
                "col": j,
                "value": solved_board[i][j]
            }

    return None