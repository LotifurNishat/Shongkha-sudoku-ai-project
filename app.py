from flask import Flask, request, jsonify, render_template, session
import os
import uuid
import json

# your existing modules
from generator.generator import generate_full_board, remove_numbers
from solver.backtracking import solve
from solver.hint import get_hint
from utils.validation import is_valid_board

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")
# In-memory store for versus games
versus_games = {}

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

@app.route("/custom")
def custom():
    return render_template("custom.html")

@app.route("/versus")
def versus_setup():
    return render_template("versus_setup.html")

@app.route("/versus/game")
def versus_game():
    game_id = request.args.get('game_id')
    player = request.args.get('player')  # '1' or '2'
    if not game_id or not player:
        return "Invalid game", 400
    return render_template("versus_game.html", game_id=game_id, player=player)

# -------------------------------
# API ROUTES (BACKEND LOGIC)
# -------------------------------

# 1. Generate Sudoku Puzzle (existing)
@app.route('/generate', methods=['GET'])
def generate():
    difficulty = request.args.get('difficulty', 'easy')
    valid_difficulties = ['easy', 'medium', 'hard']
    if difficulty not in valid_difficulties:
        return jsonify({"error": "Invalid difficulty. Choose easy, medium, or hard."}), 400
    full_board = generate_full_board()
    puzzle = remove_numbers(full_board, difficulty)
    return jsonify({"board": puzzle})

# 2. Solve Sudoku (existing)
@app.route('/solve', methods=['POST'])
def solve_sudoku():
    data = request.get_json()
    board = data.get('board')
    if not board or not is_valid_board(board):
        return jsonify({"error": "Invalid board"}), 400
    solve(board)
    return jsonify({"board": board})

# 3. Get Hint (existing)
@app.route('/hint', methods=['POST'])
def hint():
    data = request.get_json()
    if not data or 'board' not in data:
        return jsonify({"error": "No board provided"}), 400
    board = data['board']
    hint_data = get_hint(board)
    return jsonify(hint_data)

# 4. Generate full game (initial + solved) – used by custom board & new game
@app.route('/api/new_game', methods=['GET'])
def api_new_game():
    difficulty = request.args.get('difficulty', 'medium')
    solved = generate_full_board()
    puzzle = remove_numbers(solved, difficulty)
    return jsonify({
        "board": puzzle,
        "initial": puzzle,
        "solved": solved
    })

# 5. AI Hint with text explanation – used by custom board & game
@app.route('/api/hint', methods=['POST'])
def api_hint():
    data = request.get_json()
    board_input = data.get('board')
    row = data.get('row')
    col = data.get('col')
    if board_input is None:
        return jsonify({"hint": "No board provided."}), 400
    board_zero = [[0 if cell is None else cell for cell in row_list] for row_list in board_input]
    try:
        hint_result = get_hint(board_zero)
    except Exception as e:
        return jsonify({"hint": "Hint system temporarily unavailable. Keep solving!"})
    explanation = hint_result.get('explanation')
    if not explanation:
        if 'row' in hint_result and 'col' in hint_result and 'value' in hint_result:
            explanation = f"Try placing {hint_result['value']} at row {hint_result['row']+1}, column {hint_result['col']+1}."
        else:
            explanation = "Look at the 3x3 blocks and rows to find the next logical number."
    return jsonify({"hint": explanation})

# -------------------------------
# VERSUS MODE API ENDPOINTS
# -------------------------------

@app.route("/api/versus/start", methods=['POST'])
def versus_start():
    data = request.get_json()
    player1_name = data.get('player1')
    player2_name = data.get('player2')
    difficulty = data.get('difficulty', 'medium')
    
    # Generate the shared puzzle
    solved = generate_full_board()
    puzzle = remove_numbers(solved, difficulty)
    
    game_id = str(uuid.uuid4())
    versus_games[game_id] = {
        'difficulty': difficulty,
        'initial': puzzle,
        'solved': solved,
        'player1': {'name': player1_name, 'time': None, 'hints': 0, 'mistakes': 0, 'finished': False},
        'player2': {'name': player2_name, 'time': None, 'hints': 0, 'mistakes': 0, 'finished': False},
        'current_player': 1
    }
    return jsonify({'game_id': game_id})

@app.route("/api/versus/finish", methods=['POST'])
def versus_finish():
    data = request.get_json()
    game_id = data.get('game_id')
    player = data.get('player')
    time_sec = data.get('time')
    hints = data.get('hints')
    mistakes = data.get('mistakes')
    empty_cells = data.get('empty_cells', 81)
    
    if game_id not in versus_games:
        return jsonify({'error': 'Game not found'}), 404
    
    game = versus_games[game_id]
    player_key = f'player{player}'
    if game[player_key]['finished']:
        return jsonify({'error': 'Already finished'}), 400
    
    game[player_key]['time'] = time_sec
    game[player_key]['hints'] = hints
    game[player_key]['mistakes'] = mistakes
    game[player_key]['empty_cells'] = empty_cells
    game[player_key]['finished'] = True
    
    if game['player1']['finished'] and game['player2']['finished']:
        # Count fixed cells (non-zero in initial board)
        fixed_cells_count = sum(1 for row in game['initial'] for cell in row if cell != 0)
        
        def calculate_score(time_sec, hints, mistakes, empty_cells, fixed_cells_count):
            # Base score
            score = time_sec + (mistakes * 10)
            
            # Exponential hint penalty (hints^1.5 * 10)
            hint_penalty = (hints ** 1.5) * 10
            score += hint_penalty
            
            # Empty cells penalty
            score += empty_cells * 35
            
            # Completion bonus
            total_solvable = 81 - fixed_cells_count
            solved_by_player = max(0, total_solvable - empty_cells - hints)
            
            if total_solvable > 0:
                completion = solved_by_player / total_solvable
                if completion >= 0.95:
                    score *= 0.70
                elif completion >= 0.80:
                    score *= 0.85
                elif completion >= 0.60:
                    score *= 0.95
            
            return int(score)
        
        score1 = calculate_score(
            game['player1']['time'],
            game['player1']['hints'],
            game['player1']['mistakes'],
            game['player1']['empty_cells'],
            fixed_cells_count
        )
        
        score2 = calculate_score(
            game['player2']['time'],
            game['player2']['hints'],
            game['player2']['mistakes'],
            game['player2']['empty_cells'],
            fixed_cells_count
        )
        
        winner = 1 if score1 <= score2 else 2
        winner_name = game[f'player{winner}']['name']
        
        return jsonify({
            'winner': winner,
            'winner_name': winner_name,
            'score1': score1,
            'score2': score2,
            'player1_name': game['player1']['name'],
            'player2_name': game['player2']['name'],
            'player1_time': game['player1']['time'],
            'player2_time': game['player2']['time'],
            'player1_hints': game['player1']['hints'],
            'player2_hints': game['player2']['hints'],
            'player1_mistakes': game['player1']['mistakes'],
            'player2_mistakes': game['player2']['mistakes'],
            'player1_empty': game['player1']['empty_cells'],
            'player2_empty': game['player2']['empty_cells']
        })
    else:
        # Switch turn
        game['current_player'] = 2 if player == '1' else 1
        return jsonify({'next_player': game['current_player']})

@app.route("/api/versus/state", methods=['GET'])
def versus_state():
    game_id = request.args.get('game_id')
    if game_id not in versus_games:
        return jsonify({'error': 'Game not found'}), 404
    game = versus_games[game_id]
    
    # Helper to calculate score for a player (if finished)
    def get_score(player_data, fixed_cells_count):
        if not player_data['finished']:
            return None
        time_sec = player_data['time']
        hints = player_data['hints']
        mistakes = player_data['mistakes']
        empty_cells = player_data.get('empty_cells', 81)
        score = time_sec + (mistakes * 10)
        hint_penalty = (hints ** 1.5) * 10
        score += hint_penalty
        score += empty_cells * 35
        total_solvable = 81 - fixed_cells_count
        solved_by_player = max(0, total_solvable - empty_cells - hints)
        if total_solvable > 0:
            completion = solved_by_player / total_solvable
            if completion >= 0.95:
                score *= 0.70
            elif completion >= 0.80:
                score *= 0.85
            elif completion >= 0.60:
                score *= 0.95
        return int(score)
    
    fixed_cells_count = sum(1 for row in game['initial'] for cell in row if cell != 0)
    player1_score = get_score(game['player1'], fixed_cells_count)
    player2_score = get_score(game['player2'], fixed_cells_count)
    
    return jsonify({
        'initial': game['initial'],
        'solved': game['solved'],
        'current_player': game['current_player'],
        'player1_finished': game['player1']['finished'],
        'player2_finished': game['player2']['finished'],
        'player1_name': game['player1']['name'],
        'player2_name': game['player2']['name'],
        'player1_time': game['player1'].get('time'),
        'player2_time': game['player2'].get('time'),
        'player1_hints': game['player1'].get('hints', 0),
        'player2_hints': game['player2'].get('hints', 0),
        'player1_mistakes': game['player1'].get('mistakes', 0),
        'player2_mistakes': game['player2'].get('mistakes', 0),
        'player1_empty': game['player1'].get('empty_cells', 81),
        'player2_empty': game['player2'].get('empty_cells', 81),
        'player1_score': player1_score,
        'player2_score': player2_score
    })

# -------------------------------
# RUN SERVER
# -------------------------------
if __name__ == '__main__':
    app.run(debug=True)