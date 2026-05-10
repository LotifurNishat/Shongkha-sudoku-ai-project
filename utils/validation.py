def is_valid_board(board):
    try:
        if len(board) != 9:
            return False

        for row in board:
            if len(row) != 9:
                return False

            for cell in row:
                if type(cell) != int:
                    return False
                if cell < 0 or cell > 9:
                    return False

        return True

    except:
        return False