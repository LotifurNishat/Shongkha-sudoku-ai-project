from flask import Blueprint, render_template, request

views_bp = Blueprint('views', __name__)

@views_bp.route("/")
def home():
    return render_template("index.html")

@views_bp.route("/setup")
def setup():
    return render_template("setup.html")

@views_bp.route("/game")
def game():
    difficulty = request.args.get("difficulty", "medium")
    return render_template("game.html", difficulty=difficulty)

@views_bp.route("/custom")
def custom():
    return render_template("custom.html")

@views_bp.route("/versus")
def versus_setup():
    return render_template("versus_setup.html")

@views_bp.route("/versus/game")
def versus_game():
    game_id = request.args.get('game_id')
    player = request.args.get('player')  # '1' or '2'
    if not game_id or not player:
        return "Invalid game", 400
    return render_template("versus_game.html", game_id=game_id, player=player)
