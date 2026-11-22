from flask import Blueprint, jsonify, request
from config import get_db_connection
import time
import re

cliente_bp = Blueprint('cliente_bp', __name__)


def _normalizar_estado_pedido(estado_raw: str) -> str:
    val = (estado_raw or '').strip()
    lower = val.lower()
    if not val:
        return 'En preparación'
    if 'prep' in lower:
        return 'En preparación'
    if 'listo' in lower:
        return 'Listo'
    if 'entreg' in lower or 'complet' in lower:
        return 'Entregado'
    if 'pend' in lower:
        return 'Pendiente'
    if 'canc' in lower:
        return 'Cancelado'
    return val


def _descontar_stock_materia(cursor, mp_id: int, gramos_usados: float, folio: str):
    cursor.execute(
        "SELECT nombre, stock_gramos, stock_minimo_gramos, peso_unitario_kg FROM materias_primas WHERE id = %s",
        (mp_id,)
    )
    mp = cursor.fetchone()
    if not mp:
        return

    nuevo_stock = max(0.0, float(mp.get('stock_gramos') or 0) - gramos_usados)
    peso_kg = float(mp.get('peso_unitario_kg') or 1)
    gramos_por_unidad = peso_kg * 1000.0 if peso_kg > 0 else 1000.0
    nuevas_unidades = round(nuevo_stock / gramos_por_unidad, 2)

    cursor.execute(
        "UPDATE materias_primas SET stock_gramos = %s, stock_unidades = %s WHERE id = %s",
        (nuevo_stock, nuevas_unidades, mp_id)
    )

    if nuevo_stock <= float(mp.get('stock_minimo_gramos') or 0):
        msg = f"Stock critico ({folio}): {mp['nombre']} bajo a {nuevo_stock}g."
    else:
        msg = f"Consumo venta ({folio}): -{gramos_usados}g de {mp['nombre']}."

    try:
        cursor.execute("INSERT INTO notificaciones_stock (mensaje) VALUES (%s)", (msg,))
    except Exception:
        pass


def _asegurar_tabla_cupones_canjeados(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cupones_canjeados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            correo VARCHAR(180) NOT NULL,
            codigo VARCHAR(80) NOT NULL,
            fecha_canje TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_correo_codigo (correo, codigo)
        )
    """)


def _extraer_porcentaje_descuento(desc: str) -> int:
    if not desc:
        return 0
    m = re.search(r'(\d{1,2})\s*%', desc)
    if m:
        val = int(m.group(1))
        if 0 < val <= 100:
            return val
    return 0


def _obtener_codigos_canjeados(cursor, email: str) -> list:
    if not email:
        return []
    _asegurar_tabla_cupones_canjeados(cursor)
    cursor.execute(
        "SELECT codigo FROM cupones_canjeados WHERE LOWER(correo) = LOWER(%s)",
        (email,)
    )
    return [str(r.get('codigo') or '').upper().strip() for r in cursor.fetchall() if r.get('codigo')]


# ==========================================
# INGREDIENTES DE RECETA POR PRODUCTO
# ==========================================
@cliente_bp.route('/api/menu/ingredientes', methods=['GET', 'OPTIONS'])
def obtener_ingredientes_menu():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT r.producto_id, r.materia_prima_id, r.gramos_requeridos, mp.nombre AS ingrediente_nombre
                FROM recetas r
                JOIN materias_primas mp ON r.materia_prima_id = mp.id
                ORDER BY r.producto_id ASC, r.id ASC
            """)
            rows = cursor.fetchall()

            por_producto = {}
            for row in rows:
                pid = int(row['producto_id'])
                ing_nombre = str(row.get('ingrediente_nombre') or '').strip()
                if not ing_nombre:
                    continue
                if pid not in por_producto:
                    por_producto[pid] = []
                if ing_nombre not in por_producto[pid]:
                    por_producto[pid].append(ing_nombre)

            return jsonify({"success": True, "ingredientsByProduct": por_producto})
    except Exception as e:
        print("Error en /api/menu/ingredientes:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


# ==========================================
# PERFIL DE USUARIO Y DIRECCIONES
# ==========================================
@cliente_bp.route('/api/user/update', methods=['PUT', 'OPTIONS'])
def update_user_profile():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        email = (data.get('email') or '').strip()
        nombre = (data.get('name') or '').strip()
        apellido = (data.get('lastName') or '').strip()
        telefono = str(data.get('phone') or '').strip()[:10]
        direccion = (data.get('address') or '').strip()

        if not email:
            return jsonify({"success": False, "error": "Correo requerido"}), 400

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute(
                """UPDATE usuarios
                   SET nombre = %s, apellido = %s, telefono = %s, direccion = %s
                   WHERE LOWER(correo) = LOWER(%s)""",
                (nombre, apellido, telefono, direccion, email)
            )
            connection.commit()

        return jsonify({"success": True, "message": "Perfil actualizado"})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/user/update:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@cliente_bp.route('/api/user/addresses', methods=['GET', 'POST', 'OPTIONS'])
def handle_user_addresses():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'GET':
                email = (request.args.get('email') or '').strip()
                cursor.execute("SELECT direccion FROM usuarios WHERE LOWER(correo) = LOWER(%s) LIMIT 1", (email,))
                row = cursor.fetchone()
                direccion = row['direccion'] if row and row.get('direccion') else "Blvd. Adolfo López Mateos 1802, León, Gto."
                return jsonify({"success": True, "addresses": [direccion]})

            elif request.method == 'POST':
                data = request.json or {}
                email = (data.get('email') or '').strip()
                addresses = data.get('addresses') or []
                principal = (
                    addresses[0].get('full')
                    if addresses and isinstance(addresses[0], dict)
                    else (addresses[0] if addresses else None)
                )
                if email and principal:
                    cursor.execute(
                        "UPDATE usuarios SET direccion = %s WHERE LOWER(correo) = LOWER(%s)",
                        (principal, email)
                    )
                    connection.commit()
                return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/user/addresses:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


# ==========================================
# RESERVACIONES DE MESA
# ==========================================
@cliente_bp.route('/api/reservas', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
def gestionar_reservas():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'GET':
                email = (request.args.get('email') or '').strip()
                if email:
                    cursor.execute(
                        "SELECT * FROM reservas WHERE LOWER(cliente) = LOWER(%s) ORDER BY Id DESC",
                        (email,)
                    )
                else:
                    cursor.execute("SELECT * FROM reservas ORDER BY Id DESC")

                rows = cursor.fetchall()
                reservas = [{
                    "id": r.get('Id') if r.get('Id') is not None else r.get('id'),
                    "mesa": r.get('mesa'),
                    "cliente": r.get('cliente'),
                    "horario": r.get('horario'),
                    "estado": r.get('estado'),
                    "fecha": str(r.get('fecha') or '')
                } for r in rows]
                return jsonify({"success": True, "reservas": reservas})

            elif request.method == 'POST':
                d = request.json or {}
                cliente_val = (d.get('email') or d.get('cliente') or '').strip()
                fecha_val = (d.get('fecha') or '').strip()
                horario_val = (d.get('horario') or '').strip()
                mesa_val = str(d.get('mesa') or '1').strip()
                estado_val = (d.get('estado') or 'Confirmada').strip()

                if not fecha_val or not horario_val:
                    return jsonify({"success": False, "error": "Fecha y horario requeridos"}), 400

                cursor.execute(
                    """INSERT INTO reservas (mesa, cliente, horario, estado, fecha)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (mesa_val, cliente_val, horario_val, estado_val, fecha_val)
                )
                reserva_id = cursor.lastrowid
                connection.commit()
                return jsonify({"success": True, "id": reserva_id})

            elif request.method == 'DELETE':
                reserva_id = request.args.get('id')
                cursor.execute("DELETE FROM reservas WHERE Id = %s", (reserva_id,))
                connection.commit()
                return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/reservas:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


# ==========================================
# PEDIDOS DEL CLIENTE + DESCUENTO DE INVENTARIO
# ==========================================
@cliente_bp.route('/api/orders', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_pedidos():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'GET':
                email_filter = (request.args.get('email') or '').strip()
                if email_filter:
                    cursor.execute("""
                        SELECT p.*
                        FROM pedidos p
                        JOIN usuarios u ON p.usuario_id = u.id
                        WHERE LOWER(u.correo) = LOWER(%s)
                        ORDER BY p.id DESC
                    """, (email_filter,))
                else:
                    cursor.execute("SELECT * FROM pedidos ORDER BY id DESC")

                orders = [{
                    "id": o.get('id'),
                    "folio": o.get('folio', f"HM-{o.get('id', 1000)}"),
                    "type": o.get('tipo_pedido', 'Al Momento'),
                    "status": o.get('estado', 'En preparación'),
                    "total": float(o.get('monto_total', 180)),
                    "itemsText": o.get('resumen_articulos', ''),
                    "notes": o.get('notas', ''),
                    "createdAt": str(o.get('fecha_creacion', ''))
                } for o in cursor.fetchall()]
                return jsonify({"success": True, "orders": orders})

            elif request.method == 'POST':
                data = request.json or {}
                resumen = (data.get('resumen_articulos') or data.get('itemsText') or '').strip()
                folio = (data.get('folio') or f"HM-{int(time.time()) % 9000 + 1000}").strip()
                tipo_pedido = data.get('tipo_pedido') or data.get('type') or 'Al Momento'
                estado = _normalizar_estado_pedido(data.get('estado') or data.get('status') or 'En preparación')
                monto_total = float(data.get('monto_total') or data.get('total') or 0)
                notas = data.get('notas') or data.get('notes') or ''
                email_cliente = (data.get('email') or data.get('clientEmail') or '').strip()
                used_coupon_code = (data.get('usedCouponCode') or '').strip().upper()

                if not resumen or monto_total <= 0:
                    return jsonify({"success": False, "error": "El pedido no tiene platillos o el total es inválido."}), 400

                usuario_id = None
                if email_cliente:
                    cursor.execute("SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(%s) LIMIT 1", (email_cliente,))
                    u_row = cursor.fetchone()
                    if u_row:
                        usuario_id = u_row['id']

                if usuario_id is None:
                    return jsonify({"success": False, "error": "Usuario no encontrado para asociar el pedido."}), 400

                if used_coupon_code:
                    _asegurar_tabla_cupones_canjeados(cursor)
                    cursor.execute(
                        "SELECT id FROM cupones_canjeados WHERE LOWER(correo) = LOWER(%s) AND UPPER(codigo) = %s LIMIT 1",
                        (email_cliente, used_coupon_code)
                    )
                    if cursor.fetchone():
                        return jsonify({"success": False, "error": "El cupón ya fue canjeado anteriormente."}), 400

                cursor.execute(
                    """INSERT INTO pedidos (usuario_id, folio, tipo_pedido, estado, monto_total, resumen_articulos, notas)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (usuario_id, folio, tipo_pedido, estado, monto_total, resumen, notas)
                )
                pedido_id = cursor.lastrowid

                if used_coupon_code:
                    cursor.execute(
                        """INSERT IGNORE INTO cupones_canjeados (correo, codigo)
                           VALUES (%s, %s)""",
                        (email_cliente.lower(), used_coupon_code)
                    )

                cursor.execute("SELECT id, nombre, stock_porciones FROM productos")
                todos_productos = cursor.fetchall()
                descontado = False

                base_match = re.search(r'Base:\s*\[([^\]]*)\]', resumen, re.IGNORECASE)
                base_seleccionada = (
                    [x.strip().lower() for x in base_match.group(1).split(',') if x.strip()]
                    if base_match else None
                )

                for prod in todos_productos:
                    nombre_prod = (prod.get('nombre') or '').lower()
                    if nombre_prod and nombre_prod in resumen.lower():
                        descontado = True
                        nuevo_stock_prod = max(0, int(prod.get('stock_porciones') or 0) - 1)
                        cursor.execute("UPDATE productos SET stock_porciones = %s WHERE id = %s", (nuevo_stock_prod, prod['id']))

                        cursor.execute("""
                            SELECT r.materia_prima_id, r.gramos_requeridos, mp.nombre
                            FROM recetas r
                            JOIN materias_primas mp ON r.materia_prima_id = mp.id
                            WHERE r.producto_id = %s
                        """, (prod['id'],))
                        for rec in cursor.fetchall():
                            nombre_mp = (rec.get('nombre') or '').strip().lower()
                            if base_seleccionada is not None and nombre_mp:
                                if not any(nombre_mp in b or b in nombre_mp for b in base_seleccionada):
                                    continue
                            _descontar_stock_materia(
                                cursor,
                                int(rec['materia_prima_id']),
                                float(rec['gramos_requeridos'] or 80),
                                folio
                            )

                if not descontado:
                    cursor.execute("SELECT id FROM materias_primas ORDER BY id ASC LIMIT 2")
                    mps = cursor.fetchall()
                    for mp in mps:
                        _descontar_stock_materia(cursor, int(mp['id']), 100, folio)

                connection.commit()
                return jsonify({"success": True, "id": pedido_id, "folio": folio, "message": "Orden registrada"})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/orders:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


# ==========================================
# CLUB HANAMI Y DESBLOQUEO DE CUPONES
# ==========================================
@cliente_bp.route('/api/cupones/cliente', methods=['GET', 'OPTIONS'])
def obtener_cupones_cliente():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        email = (request.args.get('email') or '').strip()
        connection = get_db_connection()
        with connection.cursor() as cursor:
            completados = 0
            if email:
                cursor.execute("""
                    SELECT COUNT(*) AS total
                    FROM pedidos p
                    JOIN usuarios u ON p.usuario_id = u.id
                    WHERE LOWER(u.correo) = LOWER(%s)
                      AND (LOWER(p.estado) LIKE '%%entreg%%' OR LOWER(p.estado) LIKE '%%complet%%')
                """, (email,))
                row = cursor.fetchone()
                completados = int(row.get('total') or 0) if row else 0

            if completados >= 51:
                nivel = 'Nivel 5: Diamond Elite'
            elif completados >= 31:
                nivel = 'Nivel 4: Platinum'
            elif completados >= 16:
                nivel = 'Nivel 3: Oro'
            elif completados >= 6:
                nivel = 'Nivel 2: Plata'
            else:
                nivel = 'Nivel 1: Bronce'

            canjeados_set = set(_obtener_codigos_canjeados(cursor, email))

            cursor.execute("SELECT * FROM cupones_vip WHERE activo = 1 ORDER BY minimo_pedidos_requeridos ASC, id ASC")
            rows = cursor.fetchall()

            cupones = []
            for c in rows:
                codigo_limpio = str(c.get('codigo') or '').upper().strip()
                if not codigo_limpio or codigo_limpio in canjeados_set:
                    continue

                min_req = int(c.get('minimo_pedidos_requeridos') or 0)
                desc = str(c.get('descripcion_descuento') or '')
                pct = _extraer_porcentaje_descuento(desc)

                cupones.append({
                    "id": c.get('id'),
                    "code": codigo_limpio,
                    "description": desc,
                    "discountPercent": pct,
                    "minOrders": min_req,
                    "unlocked": completados >= min_req
                })

            return jsonify({
                "success": True,
                "completedOrders": completados,
                "tier": nivel,
                "coupons": cupones,
                "redeemedCodes": list(canjeados_set)
            })
    except Exception as e:
        print("Error en /api/cupones/cliente:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()