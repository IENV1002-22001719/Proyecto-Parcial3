from flask import Blueprint, jsonify, request
from config import get_db_connection

cocina_bp = Blueprint('cocina_bp', __name__)


def _normalizar_estado_pedido(estado_raw: str) -> str:
    val = (estado_raw or '').strip()
    lower = val.lower()
    if not val:
        return 'En preparación'
    if 'uber' in lower:
        return 'Entregado al Uber'
    if 'recoger' in lower or 'listo' in lower:
        return 'Listo para recoger'
    if 'prep' in lower:
        return 'En preparación'
    if 'entreg' in lower or 'complet' in lower:
        return 'Entregado'
    if 'pend' in lower:
        return 'Pendiente'
    if 'canc' in lower:
        return 'Cancelado'
    return val


@cocina_bp.route('/api/orders/status', methods=['PUT', 'OPTIONS'])
def actualizar_estatus_orden():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        folio = (data.get('folio') or '').strip()
        raw_status = (data.get('status') or '').strip()
        status = _normalizar_estado_pedido(raw_status)

        if not folio or not status:
            return jsonify({"success": False, "error": "Folio y estado son requeridos"}), 400

        connection = get_db_connection()
        with connection.cursor() as cursor:
            if 'notes' in data and data.get('notes') is not None:
                cursor.execute(
                    "UPDATE pedidos SET estado = %s, notas = %s WHERE folio = %s",
                    (status, data.get('notes'), folio)
                )
            else:
                cursor.execute(
                    "UPDATE pedidos SET estado = %s WHERE folio = %s",
                    (status, folio)
                )
            connection.commit()
        return jsonify({"success": True, "status": status})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/orders/status:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@cocina_bp.route('/api/mesas/status', methods=['PUT', 'OPTIONS'])
def actualizar_estado_mesa():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        mesa = data.get('mesa') or data.get('numero') or data.get('id')
        estado = (data.get('estado') or data.get('status') or 'Disponible').strip()

        if mesa is None:
            return jsonify({"success": False, "error": "Identificador de mesa requerido"}), 400

        connection = get_db_connection()
        with connection.cursor() as cursor:
            try:
                cursor.execute("SHOW TABLES LIKE 'mesas'")
                if cursor.fetchone():
                    cursor.execute("SHOW COLUMNS FROM mesas")
                    cols = {c['Field'] for c in cursor.fetchall()}
                    if 'numero' in cols:
                        cursor.execute("UPDATE mesas SET estado = %s WHERE numero = %s", (estado, mesa))
                    elif 'id' in cols:
                        cursor.execute("UPDATE mesas SET estado = %s WHERE id = %s", (estado, mesa))
                    connection.commit()
            except Exception as ex_mesa:
                print("Nota en /api/mesas/status:", ex_mesa)

        return jsonify({"success": True, "mesa": mesa, "estado": estado})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/mesas/status:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@cocina_bp.route('/api/mermas', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_mermas():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'GET':
                try:
                    cursor.execute("SELECT * FROM mermas ORDER BY id DESC")
                    mermas = cursor.fetchall()
                except Exception:
                    mermas = []
                return jsonify({"success": True, "mermas": mermas})
            elif request.method == 'POST':
                d = request.json or {}
                try:
                    cursor.execute(
                        "INSERT INTO mermas (materia_prima_id, cantidad_gramos, motivo, fecha) VALUES (1, 100, %s, NOW())",
                        (d.get('motivo', 'Merma general'),)
                    )
                    connection.commit()
                except Exception as ex:
                    print("Nota en mermas:", ex)
                return jsonify({"success": True, "message": "Merma registrada"})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/mermas:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@cocina_bp.route('/api/cortes-caja', methods=['GET', 'POST', 'OPTIONS'])
def gestionar_cortes_caja():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'GET':
                cursor.execute("""
                    SELECT cc.*, CONCAT(u.nombre, ' ', u.apellido) AS responsable
                    FROM cortes_caja cc
                    LEFT JOIN usuarios u ON cc.usuario_id = u.id
                    ORDER BY cc.id DESC
                """)
                cortes = cursor.fetchall()
                return jsonify({"success": True, "cortes": cortes})

            elif request.method == 'POST':
                d = request.json or {}
                tipo_corte = (d.get('tipo_corte') or d.get('turno') or 'Diario').strip()
                fecha_corte = (d.get('fecha_corte') or '').strip()
                fondo_inicial = float(d.get('fondo_inicial') or 0)
                ventas_efectivo = float(d.get('ventas_efectivo') if d.get('ventas_efectivo') is not None else (d.get('total_efectivo') or 0))
                ventas_tarjeta = float(d.get('ventas_tarjeta') if d.get('ventas_tarjeta') is not None else (d.get('total_tarjeta') or 0))
                ventas_transferencia = float(d.get('ventas_transferencia') if d.get('ventas_transferencia') is not None else (d.get('total_transferencia') or 0))
                ingreso_total = float(
                    d.get('ingreso_total')
                    if d.get('ingreso_total') is not None
                    else (fondo_inicial + ventas_efectivo + ventas_tarjeta + ventas_transferencia)
                )

                usuario_id = None
                correo_resp = (d.get('correo') or d.get('responsable') or '').strip()
                if correo_resp:
                    cursor.execute("SELECT id FROM usuarios WHERE correo = %s LIMIT 1", (correo_resp,))
                    u_row = cursor.fetchone()
                    if u_row:
                        usuario_id = u_row['id']
                if not usuario_id:
                    cursor.execute("SELECT id FROM usuarios ORDER BY id ASC LIMIT 1")
                    u_row = cursor.fetchone()
                    if u_row:
                        usuario_id = u_row['id']

                if fecha_corte and len(fecha_corte) == 10:
                    fecha_db = f"{fecha_corte} 00:00:00"
                elif fecha_corte:
                    fecha_db = fecha_corte
                else:
                    fecha_db = None

                if fecha_db:
                    cursor.execute("""
                        INSERT INTO cortes_caja (
                            usuario_id, tipo_corte, fondo_inicial,
                            ventas_efectivo, ventas_tarjeta, ventas_transferencia,
                            ingreso_total, fecha_corte
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        usuario_id,
                        tipo_corte,
                        fondo_inicial,
                        ventas_efectivo,
                        ventas_tarjeta,
                        ventas_transferencia,
                        ingreso_total,
                        fecha_db
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO cortes_caja (
                            usuario_id, tipo_corte, fondo_inicial,
                            ventas_efectivo, ventas_tarjeta, ventas_transferencia,
                            ingreso_total, fecha_corte
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (
                        usuario_id,
                        tipo_corte,
                        fondo_inicial,
                        ventas_efectivo,
                        ventas_tarjeta,
                        ventas_transferencia,
                        ingreso_total
                    ))

                corte_id = cursor.lastrowid
                connection.commit()
                return jsonify({"success": True, "corte_id": corte_id})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/cortes-caja:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()