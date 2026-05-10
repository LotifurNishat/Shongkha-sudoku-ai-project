from flask import Flask, request, jsonify, render_template

# import your modules
from generator.generator import generate_full_board, remove_numbers
from solver.backtracking import solve
from solver.hint import get_hint
from utils.validation import is_valid_board

app = Flask(__name__)

# -------------------------------
# FRONTEND ROUTES (HTML PAGES)
# -------------------------------

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/setup")
def setup():
    return render_template("setup.html")


@app.route("/game")
def game():
    difficulty = request.args.get("difficulty", "medium")
    return render_template("game.html", difficulty=difficulty)


# -------------------------------
# API ROUTES (BACKEND LOGIC)
# -------------------------------

# 1. Generate Sudoku Puzzle
@app.route('/generate', methods=['GET'])
def generate():

    difficulty = request.args.get('difficulty', 'easy')

    valid_difficulties = ['easy', 'medium', 'hard']

    if difficulty not in valid_difficulties:
        return jsonify({
            "error": "Invalid difficulty. Choose easy, medium, or hard."
        }), 400

    full_board = generate_full_board()
    puzzle = remove_numbers(full_board, difficulty)

    return jsonify({"board": puzzle})


# 2. Solve Sudoku
@app.route('/solve', methods=['POST'])
def solve_sudoku():

    data = request.get_json()
    board = data.get('board')

    if not board or not is_valid_board(board):
        return jsonify({"error": "Invalid board"}), 400

    solve(board)

    return jsonify({"board": board})


# 3. Get Hint
@app.route('/hint', methods=['POST'])
def hint():

    data = request.get_json()

    if not data or 'board' not in data:
        return jsonify({"error": "No board provided"}), 400

    board = data['board']

    hint_data = get_hint(board)

    return jsonify(hint_data)


# -------------------------------
# RUN SERVER
# -------------------------------
if __name__ == '__main__':
    app.run(debug=True)