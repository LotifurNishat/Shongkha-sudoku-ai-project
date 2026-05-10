from generator.generator import generate_full_board, remove_numbers

board = generate_full_board()

print("FULL SOLUTION:")
for row in board:
    print(row)

print("\nPUZZLE:")
puzzle = remove_numbers(board, "easy")

for row in puzzle:
    print(row)