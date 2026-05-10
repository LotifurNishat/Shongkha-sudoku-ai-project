from generator.generator import generate_full_board, remove_numbers
from solver.hint import get_hint

board = generate_full_board()
puzzle = remove_numbers(board, "easy")

print("PUZZLE:")
for row in puzzle:
    print(row)

hint = get_hint(puzzle)

if hint:
    print("\nHINT:")
    print(f"Row: {hint['row']}, Col: {hint['col']}, Value: {hint['value']}")
else:
    print("No hint available")