import random
from solver.backtracking import solve

def create_empty_board():
    return [[0 for _ in range(9)] for _ in range(9)]


def generate_full_board():
    board = create_empty_board()
    solve(board)
    return board

def remove_numbers(board, difficulty="easy"):

    puzzle = [row[:] for row in board]  # IMPORTANT: copy

    if difficulty == "easy":
        removals = 30
    elif difficulty == "medium":
        removals = 40
    else:
        removals = 50

    count = 0

    while count < removals:
        row = random.randint(0, 8)
        col = random.randint(0, 8)

        if puzzle[row][col] != 0:
            puzzle[row][col] = 0
            count += 1

    return puzzle

