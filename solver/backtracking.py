def is_valid(board, row, col, num):

    # Check row
    for i in range(9):
        if board[row][i] == num:
            return False

    # Check column
    for i in range(9):
        if board[i][col] == num:
            return False

    # Check 3x3 box
    start_row = row - row % 3
    start_col = col - col % 3

    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False

    return True


import random

def solve(board):

    for row in range(9):
        for col in range(9):

            if board[row][col] == 0:

                nums = list(range(1, 10))
                random.shuffle(nums)

                for num in nums:

                    if is_valid(board, row, col, num):

                        board[row][col] = num

                        if solve(board):
                            return True

                        board[row][col] = 0

                return False

    return True


