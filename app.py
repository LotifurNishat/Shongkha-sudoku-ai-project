from flask import Flask
import os

from routes.views import views_bp
from routes.api import api_bp

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret")

# Register blueprints
app.register_blueprint(views_bp)
app.register_blueprint(api_bp)

if __name__ == '__main__':
    app.run(debug=True)