from flask import Flask
from flask_cors import CORS

from routes_login import login_bp
from routes_cliente import cliente_bp
from routes_cocina import cocina_bp
from routes_admin import admin_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(login_bp)
app.register_blueprint(cliente_bp)
app.register_blueprint(cocina_bp)
app.register_blueprint(admin_bp)

if __name__ == '__main__':
    app.run(port=5000, debug=True)