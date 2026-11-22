from flask import Blueprint, jsonify, request
from config import get_db_connection

login_bp = Blueprint('login_bp', __name__)


@login_bp.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        correo = (data.get('correo') or data.get('email') or '').strip()
        contrasena = (data.get('contrasena') or data.get('password') or '').strip()

        if not correo or not contrasena:
            return jsonify({"success": False, "error": "Credenciales incorrectas o usuario no registrado en la BD"}), 400

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT u.id, u.nombre, u.apellido, u.correo, u.telefono, u.direccion, u.rol_id, u.rol, r.nombre AS rol_nombre
                   FROM usuarios u
                   LEFT JOIN roles r ON u.rol_id = r.id
                   WHERE LOWER(u.correo) = LOWER(%s) AND u.contrasena_hash = %s
                   LIMIT 1""",
                (correo, contrasena)
            )
            user = cursor.fetchone()
            if not user:
                return jsonify({"success": False, "error": "Credenciales incorrectas o usuario no registrado en la BD"}), 401

            return jsonify({
                "success": True,
                "user": {
                    "id": user.get('id'),
                    "nombre": user.get('nombre'),
                    "apellido": user.get('apellido'),
                    "correo": user.get('correo'),
                    "telefono": user.get('telefono'),
                    "direccion": user.get('direccion'),
                    "rol_id": user.get('rol_id'),
                    "rol": user.get('rol') or user.get('rol_nombre') or 'cliente'
                }
            })
    except Exception as e:
        print("Error en /api/login:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@login_bp.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        nombre = (data.get('nombre') or data.get('name') or 'Cliente').strip()
        apellido = (data.get('apellido') or data.get('lastName') or 'Hanami').strip()
        correo = (data.get('correo') or data.get('email') or '').strip()
        telefono = str(data.get('telefono') or data.get('phone') or '4770000000').strip()[:10]
        direccion = (data.get('direccion') or data.get('address') or 'León, Gto.').strip()
        contrasena = (data.get('contrasena') or data.get('password') or '12345').strip()
        fecha_nac = (data.get('fecha_nacimiento') or data.get('birthDate') or '2000-01-01').strip()
        genero = (data.get('genero') or data.get('gender') or 'Otro').strip()

        if not correo:
            return jsonify({"success": False, "error": "El correo es obligatorio"}), 400

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(%s) LIMIT 1", (correo,))
            if cursor.fetchone():
                return jsonify({"success": False, "error": "El correo ya está registrado"}), 409

            cursor.execute(
                """INSERT INTO usuarios
                   (rol_id, nombre, apellido, telefono, correo, direccion, contrasena_hash, fecha_nacimiento, genero, rol)
                   VALUES (3, %s, %s, %s, %s, %s, %s, %s, %s, 'cliente')""",
                (nombre, apellido, telefono, correo, direccion, contrasena, fecha_nac, genero)
            )
            user_id = cursor.lastrowid
            connection.commit()

        return jsonify({
            "success": True,
            "id": user_id,
            "message": "Usuario registrado correctamente"
        })
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/register:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()