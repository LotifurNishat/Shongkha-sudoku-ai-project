import uuid
from generator.generator import generate_full_board, remove_numbers

class VersusManager:
    def __init__(self):
        self.versus_games = {}

    def start_game(self, player1_name, player2_name, difficulty="medium"):
        # Generate the shared puzzle
        solved = generate_full_board()
        puzzle = remove_numbers(solved, difficulty)
        
        game_id = str(uuid.uuid4())
        self.versus_games[game_id] = {
            'difficulty': difficulty,
            'initial': puzzle,
            'solved': solved,
            'player1': {'name': player1_name, 'time': None, 'hints': 0, 'mistakes': 0, 'finished': False},
            'player2': {'name': player2_name, 'time': None, 'hints': 0, 'mistakes': 0, 'finished': False},
            'current_player': 1
        }
        return game_id

    def get_game(self, game_id):
        return self.versus_games.get(game_id)

    def calculate_score(self, time_sec, hints, mistakes, empty_cells, fixed_cells_count):
        # Base score (lower penalty is better)
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

    def finish_turn(self, game_id, player, time_sec, hints, mistakes, empty_cells):
        game = self.get_game(game_id)
        if not game:
            raise KeyError("Game not found")
        
        player_key = f'player{player}'
        if game[player_key]['finished']:
            raise ValueError("Player has already finished their turn")
        
        game[player_key]['time'] = time_sec
        game[player_key]['hints'] = hints
        game[player_key]['mistakes'] = mistakes
        game[player_key]['empty_cells'] = empty_cells
        game[player_key]['finished'] = True
        
        if game['player1']['finished'] and game['player2']['finished']:
            # Count fixed cells (non-zero in initial board)
            fixed_cells_count = sum(1 for row in game['initial'] for cell in row if cell != 0)
            
            score1 = self.calculate_score(
                game['player1']['time'],
                game['player1']['hints'],
                game['player1']['mistakes'],
                game['player1']['empty_cells'],
                fixed_cells_count
            )
            
            score2 = self.calculate_score(
                game['player2']['time'],
                game['player2']['hints'],
                game['player2']['mistakes'],
                game['player2']['empty_cells'],
                fixed_cells_count
            )
            
            winner = 1 if score1 <= score2 else 2
            winner_name = game[f'player{winner}']['name']
            
            return {
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
            }
        else:
            # Switch turn
            game['current_player'] = 2 if player == '1' else 1
            return {'next_player': game['current_player']}

    def get_game_state(self, game_id):
        game = self.get_game(game_id)
        if not game:
            return None
        
        fixed_cells_count = sum(1 for row in game['initial'] for cell in row if cell != 0)
        
        player1_score = None
        if game['player1']['finished']:
            player1_score = self.calculate_score(
                game['player1']['time'],
                game['player1']['hints'],
                game['player1']['mistakes'],
                game['player1'].get('empty_cells', 81),
                fixed_cells_count
            )
            
        player2_score = None
        if game['player2']['finished']:
            player2_score = self.calculate_score(
                game['player2']['time'],
                game['player2']['hints'],
                game['player2']['mistakes'],
                game['player2'].get('empty_cells', 81),
                fixed_cells_count
            )
            
        return {
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
        }

# Global instance
versus_manager = VersusManager()
