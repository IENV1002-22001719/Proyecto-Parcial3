from flask import Blueprint, jsonify, request
from config import get_db_connection
import json
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
    if lower == 'completado':
        return 'Completado'
    if 'entreg' in lower or 'complet' in lower:
        return 'Entregado'
    if 'pend' in lower:
        return 'Pendiente'
    if 'canc' in lower:
        return 'Cancelado'
    return val


def _es_estado_final_pedido(estado: str) -> bool:
    return (estado or '').strip().lower() in {'entregado', 'entregado al uber'}


def _obtener_reserva_producto(cursor, producto_id: int, excluir_pedido_id=None) -> int:
    sql = """
        SELECT COALESCE(SUM(d.cantidad), 0) AS reservado
        FROM pedido_detalles d
        JOIN pedidos p ON p.id = d.pedido_id
        WHERE d.producto_id = %s
          AND p.stock_descontado = 0
          AND LOWER(p.estado) NOT IN ('entregado', 'entregado al uber', 'cancelado')
    """
    params = [producto_id]
    if excluir_pedido_id is not None:
        sql += " AND p.id <> %s"
        params.append(excluir_pedido_id)
    cursor.execute(sql, tuple(params))
    return int((cursor.fetchone() or {}).get('reservado') or 0)


def _analizar_items_resumen(cursor, resumen: str) -> list:
    """Compatibilidad para pedidos antiguos que no tienen filas en pedido_detalles."""
    cursor.execute("SELECT id, nombre FROM productos ORDER BY CHAR_LENGTH(nombre) DESC")
    productos = cursor.fetchall()
    items = []
    ocupados = []
    for producto in productos:
        nombre = (producto.get('nombre') or '').strip()
        if not nombre:
            continue
        patron = re.compile(r'(\d+)\s*[x×]\s*' + re.escape(nombre) + r'(?=\s*(?:\(|,|$))', re.IGNORECASE)
        for match in patron.finditer(resumen or ''):
            if any(match.start() < fin and match.end() > inicio for inicio, fin in ocupados):
                continue
            fin_item = re.search(r',\s*\d+\s*[x×]\s*', (resumen or '')[match.end():])
            segmento = (resumen or '')[match.end():match.end() + fin_item.start()] if fin_item else (resumen or '')[match.end():]
            base_match = re.search(r'Base:\s*\[([^\]]*)\]', segmento, re.IGNORECASE)
            ingredientes = [x.strip() for x in base_match.group(1).split(',') if x.strip()] if base_match else None
            items.append({
                'productId': int(producto['id']),
                'quantity': int(match.group(1)),
                'ingredients': ingredientes
            })
            ocupados.append((match.start(), match.end()))
    return items


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
                estado = 'En preparación'
                monto_total = float(data.get('monto_total') or data.get('total') or 0)
                notas = data.get('notas') or data.get('notes') or ''
                email_cliente = (data.get('email') or data.get('clientEmail') or '').strip()
                used_coupon_code = (data.get('usedCouponCode') or '').strip().upper()
                items = data.get('items') if isinstance(data.get('items'), list) else []

                metodo_pago = re.search(r'Pago:\s*([^|]+)', notas, re.IGNORECASE)
                if metodo_pago and 'efectivo' in metodo_pago.group(1).lower():
                    return jsonify({"success": False, "error": "El pago en efectivo ya no está disponible. Elige tarjeta o transferencia."}), 400

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

                if not items:
                    items = _analizar_items_resumen(cursor, resumen)
                if not items:
                    return jsonify({"success": False, "error": "No se pudieron identificar los platillos del pedido."}), 400

                cantidad_por_producto = {}
                detalles_validados = []
                for item in items:
                    try:
                        producto_id = int(item.get('productId') or item.get('producto_id'))
                        cantidad = int(item.get('quantity') or item.get('cantidad'))
                    except (TypeError, ValueError):
                        return jsonify({"success": False, "error": "El pedido contiene un platillo o cantidad inválidos."}), 400
                    if cantidad < 1:
                        return jsonify({"success": False, "error": "La cantidad debe ser al menos 1."}), 400
                    cursor.execute(
                        "SELECT id, nombre, stock_porciones, disponible FROM productos WHERE id = %s FOR UPDATE",
                        (producto_id,)
                    )
                    producto = cursor.fetchone()
                    if not producto or not int(producto.get('disponible') or 0):
                        return jsonify({"success": False, "error": "Uno de los platillos ya no está disponible."}), 409
                    reservadas = _obtener_reserva_producto(cursor, producto_id)
                    cursor.execute("""
                        SELECT mp.nombre, mp.stock_gramos, rec.gramos_requeridos
                        FROM recetas rec
                        JOIN materias_primas mp ON mp.id = rec.materia_prima_id
                        WHERE rec.producto_id = %s
                        FOR UPDATE
                    """, (producto_id,))
                    receta = cursor.fetchall()
                    stock_por_receta = None
                    if receta:
                        capacidades = []
                        for ingrediente in receta:
                            requerido = float(ingrediente.get('gramos_requeridos') or 0)
                            stock_gramos = float(ingrediente.get('stock_gramos') or 0)
                            capacidades.append(int(stock_gramos // requerido) if requerido > 0 else 0)
                        stock_por_receta = min(capacidades) if capacidades else 0
                    stock_producto = int(producto.get('stock_porciones') or 0)
                    stock_base = stock_por_receta if stock_por_receta is not None else stock_producto
                    disponibles = max(0, stock_base - reservadas)
                    acumulada = cantidad_por_producto.get(producto_id, 0) + cantidad
                    if acumulada > disponibles:
                        return jsonify({
                            "success": False,
                            "error": f"No hay stock suficiente de {producto['nombre']}. Quedan {disponibles}; reduce la cantidad."
                        }), 409
                    ingredients = item.get('ingredients') if isinstance(item.get('ingredients'), list) else None
                    cantidad_por_producto[producto_id] = acumulada
                    detalles_validados.append({
                        'productId': producto_id,
                        'quantity': cantidad,
                        'ingredients': ingredients
                    })

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

                for detalle in detalles_validados:
                    cursor.execute(
                        "INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, ingredientes) VALUES (%s, %s, %s, %s)",
                        (pedido_id, detalle['productId'], detalle['quantity'], json.dumps(detalle['ingredients'], ensure_ascii=False) if detalle['ingredients'] is not None else None)
                    )

                if used_coupon_code:
                    cursor.execute(
                        """INSERT IGNORE INTO cupones_canjeados (correo, codigo)
                           VALUES (%s, %s)""",
                        (email_cliente.lower(), used_coupon_code)
                    )

                connection.commit()
                return jsonify({"success": True, "id": pedido_id, "folio": folio, "message": "Orden registrada; el inventario se descontará al entregar"})
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
                      AND LOWER(p.estado) LIKE '%%entreg%%'
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
