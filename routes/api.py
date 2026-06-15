from flask import Blueprint, request, jsonify
from generator.generator import generate_full_board, remove_numbers
from solver.backtracking import solve
from solver.hint import get_hint
from utils.validation import is_valid_board
from services.versus_manager import versus_manager

api_bp = Blueprint('api', __name__)

# 1. Generate Sudoku Puzzle
@api_bp.route('/generate', methods=['GET'])
def generate():
    difficulty = request.args.get('difficulty', 'easy')
    valid_difficulties = ['easy', 'medium', 'hard']
    if difficulty not in valid_difficulties:
        return jsonify({"error": "Invalid difficulty. Choose easy, medium, or hard."}), 400
    full_board = generate_full_board()
    puzzle = remove_numbers(full_board, difficulty)
    return jsonify({"board": puzzle})

# 2. Solve Sudoku
@api_bp.route('/solve', methods=['POST'])
def solve_sudoku():
    data = request.get_json()
    board = data.get('board')
    if not board or not is_valid_board(board):
        return jsonify({"error": "Invalid board"}), 400
    solve(board)
    return jsonify({"board": board})

# 3. Get Hint (basic)
@api_bp.route('/hint', methods=['POST'])
def hint():
    data = request.get_json()
    if not data or 'board' not in data:
        return jsonify({"error": "No board provided"}), 400
    board = data['board']
    hint_data = get_hint(board)
    return jsonify(hint_data)

# 4. Generate full game (initial + solved)
@api_bp.route('/api/new_game', methods=['GET'])
def api_new_game():
    difficulty = request.args.get('difficulty', 'medium')
    solved = generate_full_board()
    puzzle = remove_numbers(solved, difficulty)
    return jsonify({
        "board": puzzle,
        "initial": puzzle,
        "solved": solved
    })

# 5. AI Hint with text explanation
@api_bp.route('/api/hint', methods=['POST'])
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
    
    explanation = hint_result.get('explanation') if hint_result else None
    if not explanation:
        if hint_result and 'row' in hint_result and 'col' in hint_result and 'value' in hint_result:
            explanation = f"Try placing {hint_result['value']} at row {hint_result['row']+1}, column {hint_result['col']+1}."
        else:
            explanation = "Look at the 3x3 blocks and rows to find the next logical number."
    return jsonify({"hint": explanation})

# -------------------------------
# VERSUS MODE API ENDPOINTS
# -------------------------------

@api_bp.route("/api/versus/start", methods=['POST'])
def versus_start():
    data = request.get_json()
    player1_name = data.get('player1')
    player2_name = data.get('player2')
    difficulty = data.get('difficulty', 'medium')
    
    game_id = versus_manager.start_game(player1_name, player2_name, difficulty)
    return jsonify({'game_id': game_id})

@api_bp.route("/api/versus/finish", methods=['POST'])
def versus_finish():
    data = request.get_json()
    game_id = data.get('game_id')
    player = data.get('player')
    time_sec = data.get('time')
    hints = data.get('hints')
    mistakes = data.get('mistakes')
    empty_cells = data.get('empty_cells', 81)
    
    if not game_id or not player:
        return jsonify({'error': 'Missing game_id or player parameter'}), 400
    
    try:
        result = versus_manager.finish_turn(game_id, player, time_sec, hints, mistakes, empty_cells)
        return jsonify(result)
    except KeyError:
        return jsonify({'error': 'Game not found'}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@api_bp.route("/api/versus/state", methods=['GET'])
def versus_state():
    game_id = request.args.get('game_id')
    player = request.args.get('player', '1')
    if not game_id:
        return jsonify({'error': 'Missing game_id'}), 400
    
    state = versus_manager.get_game_state(game_id, player)
    if not state:
        return jsonify({'error': 'Game not found'}), 404
        
    return jsonify(state)
