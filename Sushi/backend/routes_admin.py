from flask import Blueprint, jsonify, request
from config import get_db_connection
import re
import time

admin_bp = Blueprint('admin_bp', __name__)


def _normalizar_unidad(unidad: str) -> str:
    u = (unidad or 'gramos').lower().strip()
    if u in ('kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'):
        return 'kg'
    if u in ('pieza', 'piezas', 'pz', 'pza', 'unidad', 'unidades'):
        return 'pieza'
    return 'gramos'


def _resolver_valor_enum_unidad(cursor, unidad_norm: str) -> str:
    try:
        cursor.execute("SHOW COLUMNS FROM materias_primas LIKE 'tipo_unidad'")
        col_info = cursor.fetchone()
        col_type = (col_info.get('Type') or '') if col_info else ''
        enum_vals = re.findall(r"'([^']*)'", col_type)
        if not enum_vals:
            return unidad_norm

        enum_lower = {v.lower(): v for v in enum_vals}
        if unidad_norm in enum_lower:
            return enum_lower[unidad_norm]

        candidatos = {
            'kg': ['kg', 'kilo', 'kilos', 'kilogramos', enum_vals[0]],
            'pieza': ['pz', 'pza', 'pieza', 'piezas', 'unidad', enum_vals[0]],
            'gramos': ['g', 'gr', 'gramos', 'gramo', enum_vals[0]],
        }
        for cand in candidatos.get(unidad_norm, [enum_vals[0]]):
            if cand.lower() in enum_lower:
                return enum_lower[cand.lower()]
        return enum_vals[0]
    except Exception:
        return 'g' if unidad_norm == 'gramos' else ('pz' if unidad_norm == 'pieza' else 'kg')


def _convertir_a_gramos(cantidad: float, unidad: str) -> float:
    u = _normalizar_unidad(unidad)
    if u == 'kg':
        return cantidad * 1000.0
    if u == 'pieza':
        return cantidad * 100.0
    return cantidad


def _sumar_stock_materia(cursor, mp_id: int, gramos_extra: float, cant_pedida: float, unidad_pedida: str):
    cursor.execute("SELECT peso_unitario_kg FROM materias_primas WHERE id = %s", (mp_id,))
    row = cursor.fetchone()
    peso_kg = float(row.get('peso_unitario_kg') or 1) if row else 1.0
    gramos_por_unidad = peso_kg * 1000.0 if peso_kg > 0 else 1000.0
    unidades_extra = cant_pedida if _normalizar_unidad(unidad_pedida) == 'pieza' else round(gramos_extra / gramos_por_unidad, 2)

    cursor.execute("""
        UPDATE materias_primas
        SET stock_gramos = stock_gramos + %s,
            stock_unidades = stock_unidades + %s
        WHERE id = %s
    """, (gramos_extra, unidades_extra, mp_id))


def _guardar_receta(cursor, producto_id, ingredients_list):
    if not producto_id or not isinstance(ingredients_list, list):
        return
    try:
        cursor.execute("SHOW COLUMNS FROM recetas")
        rec_cols = {row['Field'] for row in cursor.fetchall()}
        if not {'producto_id', 'materia_prima_id'}.issubset(rec_cols):
            return

        cursor.execute("DELETE FROM recetas WHERE producto_id = %s", (producto_id,))
        for ing_name in ingredients_list:
            cursor.execute("SELECT id FROM materias_primas WHERE nombre = %s LIMIT 1", (ing_name,))
            row = cursor.fetchone()
            if row:
                if 'gramos_requeridos' in rec_cols:
                    cursor.execute(
                        "INSERT INTO recetas (producto_id, materia_prima_id, gramos_requeridos) VALUES (%s, %s, 80)",
                        (producto_id, row['id'])
                    )
                else:
                    cursor.execute(
                        "INSERT INTO recetas (producto_id, materia_prima_id) VALUES (%s, %s)",
                        (producto_id, row['id'])
                    )
    except Exception as ex_rec:
        print("Nota en _guardar_receta:", ex_rec)


def _sanitizar_imagen_url(raw_url: str) -> str:
    default_img = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80'
    url = (raw_url or '').strip()
    if not url or not (url.startswith('http://') or url.startswith('https://') or url.startswith('/')):
        return default_img
    if 'bing.com/images/search' in url or 'google.com/imgres' in url:
        return default_img
    return url[:500]


def _min_pedidos_por_nivel(nivel_str: str) -> int:
    n = (nivel_str or '').lower()
    if 'elite' in n:
        return 25
    if 'platinum' in n:
        return 15
    if 'oro' in n or 'gold' in n:
        return 8
    if 'plata' in n or 'silver' in n:
        return 4
    return 1


def _extraer_nivel_de_desc(desc: str, min_pedidos: int) -> str:
    txt = (desc or '').lower()
    for lvl in ('Elite', 'Platinum', 'Oro', 'Plata', 'Bronce'):
        if lvl.lower() in txt:
            return lvl
    if min_pedidos >= 25:
        return 'Elite'
    if min_pedidos >= 15:
        return 'Platinum'
    if min_pedidos >= 8:
        return 'Oro'
    if min_pedidos >= 4:
        return 'Plata'
    return 'Bronce'


def _insertar_materia_prima(cursor, proveedor_id: int, nombre: str, abc: str, unidad: str, cantidad_raw, costo_raw):
    cant = float(cantidad_raw if cantidad_raw not in (None, '') else 0)
    if cant <= 0:
        cant = 1.0
    u_norm = _normalizar_unidad(unidad)
    u_db = _resolver_valor_enum_unidad(cursor, u_norm)
    stock_g = _convertir_a_gramos(cant, u_norm)
    unidades_val = cant if u_norm == 'pieza' else (cant if u_norm == 'kg' else round(stock_g / 1000.0, 2))
    costo_val = float(costo_raw if costo_raw not in (None, '') else 0)

    cursor.execute("SHOW COLUMNS FROM materias_primas")
    cols = {row['Field'] for row in cursor.fetchall()}

    payload = {
        'proveedor_id': int(proveedor_id),
        'nombre': nombre.strip(),
        'categoria_abc': abc or 'Clase A',
        'tipo_unidad': u_db,
        'peso_unitario_kg': 1.00,
        'stock_unidades': max(0.01, unidades_val),
        'stock_gramos': stock_g,
        'stock_minimo_gramos': 1000,
        'costo_por_unidad': costo_val,
    }

    insert_cols = [k for k, v in payload.items() if k in cols]
    insert_vals = [payload[k] for k in insert_cols]
    placeholders = ", ".join(["%s"] * len(insert_cols))

    cursor.execute(
        f"INSERT INTO materias_primas ({', '.join(insert_cols)}) VALUES ({placeholders})",
        tuple(insert_vals)
    )


def _eliminar_usuario_seguro(cursor, user_id: int, solo_cliente: bool = False):
    if solo_cliente:
        cursor.execute("SELECT id, correo FROM usuarios WHERE id = %s AND rol_id = 3", (user_id,))
    else:
        cursor.execute("SELECT id, correo FROM usuarios WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    if not row:
        return False

    correo = (row.get('correo') or '').strip()
    if correo:
        try:
            cursor.execute("DELETE FROM cupones_canjeados WHERE LOWER(correo) = LOWER(%s)", (correo,))
        except Exception:
            pass

    cursor.execute("DELETE FROM pedidos WHERE usuario_id = %s", (user_id,))
    cursor.execute("DELETE FROM cortes_caja WHERE usuario_id = %s", (user_id,))

    if solo_cliente:
        cursor.execute("DELETE FROM usuarios WHERE id = %s AND rol_id = 3", (user_id,))
    else:
        cursor.execute("DELETE FROM usuarios WHERE id = %s", (user_id,))
    return True


@admin_bp.route('/api/data', methods=['GET', 'OPTIONS'])
def get_data():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM productos ORDER BY id DESC")
            db_products = cursor.fetchall()
            products = []
            for r in db_products:
                nombre = (r.get('nombre') or '').lower()
                if r.get('imagen_url') and str(r.get('imagen_url')).startswith('http'):
                    img_url = r.get('imagen_url')
                elif 'chirashi' in nombre:
                    img_url = 'https://asianinspirations.com.au/wp-content/uploads/2018/07/R00562_Chirashizushi.jpg'
                elif 'temaki' in nombre:
                    img_url = 'https://www.orientalmarket.es/wp-content/uploads/2015/10/Temaki-Salm%C3%A3o-1024x683.jpg'
                elif 'hosomaki' in nombre:
                    img_url = 'https://cdn.shopify.com/s/files/1/0353/5621/articles/Hosomaki-Sushi-Rolls_1112x.jpg?v=1612387843'
                elif 'uramaki' in nombre:
                    img_url = 'https://gomagcdn.ro/domains/eihshop.ro/files/files/uramaki-sushi-header-17329.jpeg'
                elif 'gunkan' in nombre:
                    img_url = 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=600&q=80'
                elif 'nigiri' in nombre:
                    img_url = 'https://img.freepik.com/premium-photo/photo-platter-sushi-nigiri-with-fresh-fish-slices-perfectly-formed-rice-generative-ai_630290-10506.jpg'
                else:
                    img_url = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80'

                ingredients = ["Arroz japonés grano corto (Nishiki)"]
                try:
                    cursor.execute("""
                        SELECT mp.nombre
                        FROM recetas rec
                        JOIN materias_primas mp ON rec.materia_prima_id = mp.id
                        WHERE rec.producto_id = %s
                    """, (r.get('id'),))
                    ing_rows = cursor.fetchall()
                    if ing_rows:
                        ingredients = [row['nombre'] for row in ing_rows]
                except Exception:
                    pass

                products.append({
                    "id": r.get('id'),
                    "name": r.get('nombre'),
                    "description": r.get('descripcion', ''),
                    "price": float(r.get('precio', 0)),
                    "stock": int(r.get('stock_porciones', 10)),
                    "disponible": int(r.get('disponible', 1)),
                    "image": img_url,
                    "ingredients": ingredients
                })

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

            cursor.execute("SELECT * FROM proveedores ORDER BY id ASC")
            providers = [{
                "id": p.get('id'),
                "nombre_empresa": p.get('nombre'),
                "contacto": p.get('contacto_nombre'),
                "telefono": p.get('telefono'),
                "correo": p.get('correo'),
                "insumo_principal": p.get('categoria')
            } for p in cursor.fetchall()]

            cursor.execute("""
                SELECT mp.*, p.nombre AS proveedor_nombre
                FROM materias_primas mp
                LEFT JOIN proveedores p ON mp.proveedor_id = p.id
                ORDER BY mp.id ASC
            """)
            raw_materials = [{
                "id": rm.get('id'),
                "proveedor_id": rm.get('proveedor_id'),
                "proveedor_nombre": rm.get('proveedor_nombre') or f"Proveedor #{rm.get('proveedor_id')}",
                "name": rm.get('nombre'),
                "abc": rm.get('categoria_abc'),
                "stock": float(rm.get('stock_gramos', 0)),
                "stock_unidades": float(rm.get('stock_unidades', 0)),
                "stock_minimo": float(rm.get('stock_minimo_gramos', 0)),
                "peso_unitario_kg": float(rm.get('peso_unitario_kg', 1) or 1),
                "unit": rm.get('tipo_unidad'),
                "costo": float(rm.get('costo_por_unidad', 0))
            } for rm in cursor.fetchall()]

            purchase_orders = []
            try:
                cursor.execute("""
                    SELECT oc.*, p.nombre AS proveedor_nombre
                    FROM ordenes_compra oc
                    LEFT JOIN proveedores p ON oc.proveedor_id = p.id
                    ORDER BY oc.id DESC
                """)
                for oc in cursor.fetchall():
                    purchase_orders.append({
                        "id": oc.get('id'),
                        "proveedor_id": oc.get('proveedor_id'),
                        "proveedor_nombre": oc.get('proveedor_nombre') or f"Proveedor #{oc.get('proveedor_id')}",
                        "folio": oc.get('folio') or f"OC-{oc.get('id')}",
                        "detalle_insumos": oc.get('detalle_insumos') or oc.get('notas') or '',
                        "monto_total": float(oc.get('monto_total') or oc.get('total') or 0),
                        "estado": oc.get('estado') or 'Pendiente',
                        "fecha": str(oc.get('fecha_orden') or oc.get('fecha_creacion') or '')
                    })
            except Exception as ex_oc:
                print("Nota cargando ordenes_compra:", ex_oc)

            cursor.execute("""
                SELECT u.id, u.nombre, u.apellido, u.correo, u.telefono, u.direccion, r.nombre AS rol_nombre
                FROM usuarios u
                JOIN roles r ON u.rol_id = r.id
                WHERE u.rol_id IN (1, 2)
                ORDER BY u.id ASC
            """)
            users = [{
                "id": u.get('id'),
                "nombre": f"{u.get('nombre')} {u.get('apellido')}".strip(),
                "correo": u.get('correo'),
                "telefono": u.get('telefono'),
                "direccion": u.get('direccion'),
                "rol": u.get('rol_nombre')
            } for u in cursor.fetchall()]

            cursor.execute("""
                SELECT u.id, u.nombre, u.apellido, u.correo, u.telefono, u.direccion, r.nombre AS rol_nombre
                FROM usuarios u
                JOIN roles r ON u.rol_id = r.id
                WHERE u.rol_id = 3
                ORDER BY u.id ASC
            """)
            clients = [{
                "id": c.get('id'),
                "nombre": f"{c.get('nombre')} {c.get('apellido')}".strip(),
                "correo": c.get('correo'),
                "telefono": c.get('telefono'),
                "direccion": c.get('direccion'),
                "rol": c.get('rol_nombre')
            } for c in cursor.fetchall()]

            cursor.execute("SELECT * FROM cupones_vip ORDER BY id DESC")
            coupons = []
            for c in cursor.fetchall():
                min_p = int(c.get('minimo_pedidos_requeridos') or 1)
                desc = c.get('descripcion_descuento') or ''
                lvl = _extraer_nivel_de_desc(desc, min_p)
                coupons.append({
                    "id": c.get('id'),
                    "code": c.get('codigo'),
                    "tipo": "Regalo" if "gratis" in desc.lower() else "Descuento",
                    "valor": desc,
                    "nivel": lvl,
                    "active": int(c.get('activo', 1)) == 1
                })

            active_coupons = [c for c in coupons if c.get('active')]

            cursor.execute("SELECT * FROM notificaciones_stock ORDER BY id DESC LIMIT 20")
            notifications = [{
                "id": n.get('id'),
                "mensaje": n.get('mensaje'),
                "fecha": str(n.get('fecha') or n.get('fecha_creacion') or '')
            } for n in cursor.fetchall()]

            cursor.execute("""
                SELECT cc.*, CONCAT(u.nombre, ' ', u.apellido) AS cajero
                FROM cortes_caja cc
                LEFT JOIN usuarios u ON cc.usuario_id = u.id
                ORDER BY cc.id DESC
            """)
            cortes = cursor.fetchall()

        return jsonify({
            "success": True,
            "products": products,
            "orders": orders,
            "users": users,
            "clients": clients,
            "rawMaterials": raw_materials,
            "providers": providers,
            "purchaseOrders": purchase_orders,
            "coupons": coupons,
            "activeCoupons": active_coupons,
            "notifications": notifications,
            "cortes": cortes
        })
    except Exception as e:
        print("Error en /api/data:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/productos', methods=['POST', 'PUT', 'DELETE', 'OPTIONS'])
def gestionar_productos():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json if request.method in ('POST', 'PUT') else {}
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'POST':
                nombre = (data.get('name') or '').strip()
                if not nombre:
                    return jsonify({"success": False, "error": "Nombre del platillo requerido"}), 400

                img_url = _sanitizar_imagen_url(data.get('image'))
                cursor.execute("SHOW COLUMNS FROM productos")
                prod_cols = {row['Field'] for row in cursor.fetchall()}

                payload = {
                    'nombre': nombre,
                    'descripcion': (data.get('description') or '').strip(),
                    'precio': float(data.get('price') or 0),
                    'stock_porciones': int(data.get('stock') or 10),
                    'imagen_url': img_url,
                    'disponible': 1
                }
                insert_cols = [k for k in payload.keys() if k in prod_cols]
                insert_vals = [payload[k] for k in insert_cols]
                placeholders = ", ".join(["%s"] * len(insert_cols))

                cursor.execute(
                    f"INSERT INTO productos ({', '.join(insert_cols)}) VALUES ({placeholders})",
                    tuple(insert_vals)
                )
                prod_id = cursor.lastrowid
                _guardar_receta(cursor, prod_id, data.get('ingredients', []))

            elif request.method == 'PUT':
                prod_id = data.get('id')
                img_url = _sanitizar_imagen_url(data.get('image'))
                sql = "UPDATE productos SET nombre = %s, descripcion = %s, precio = %s, stock_porciones = %s, imagen_url = %s WHERE id = %s"
                cursor.execute(sql, (
                    (data.get('name') or '').strip(),
                    (data.get('description') or '').strip(),
                    float(data.get('price') or 0),
                    int(data.get('stock') or 10),
                    img_url,
                    prod_id
                ))
                _guardar_receta(cursor, prod_id, data.get('ingredients', []))

            elif request.method == 'DELETE':
                prod_id = request.args.get('id')
                try:
                    cursor.execute("DELETE FROM recetas WHERE producto_id = %s", (prod_id,))
                except Exception:
                    pass
                cursor.execute("DELETE FROM productos WHERE id = %s", (prod_id,))

            connection.commit()
        return jsonify({"success": True, "message": "Operacion exitosa"})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/productos:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/products/availability', methods=['PUT', 'OPTIONS'])
def actualizar_disponibilidad():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("UPDATE productos SET disponible = %s WHERE id = %s", (int(data.get('disponible', 1)), data.get('id')))
            connection.commit()
        return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/products/availability:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/proveedores', methods=['POST', 'DELETE', 'OPTIONS'])
def reg_prov():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'POST':
                d = request.json or {}
                nombre_emp = (d.get('nombre_empresa') or '').strip()
                if not nombre_emp:
                    return jsonify({"success": False, "error": "Nombre de empresa requerido"}), 400

                cursor.execute(
                    "INSERT INTO proveedores (nombre, contacto_nombre, telefono, correo, categoria) VALUES (%s, %s, %s, %s, %s)",
                    (
                        nombre_emp,
                        (d.get('contacto') or 'Contacto').strip(),
                        str(d.get('telefono') or '4770000000').strip()[:10],
                        (d.get('correo') or 'contacto@proveedor.com').strip(),
                        (d.get('insumo_principal') or 'General').strip()
                    )
                )
                prov_id = cursor.lastrowid

                insumos = d.get('insumos') or []
                if isinstance(insumos, list):
                    for ins in insumos:
                        nombre_ins = (ins.get('name') or '').strip()
                        if nombre_ins:
                            _insertar_materia_prima(
                                cursor,
                                prov_id,
                                nombre_ins,
                                ins.get('abc', 'Clase A'),
                                ins.get('unidad', 'gramos'),
                                ins.get('cantidad', 1000),
                                ins.get('costo', 100)
                            )
                connection.commit()
                return jsonify({"success": True, "proveedor_id": prov_id})

            elif request.method == 'DELETE':
                prov_id = request.args.get('id')
                if not prov_id:
                    return jsonify({"success": False, "error": "ID de proveedor requerido"}), 400
                cursor.execute("SELECT id FROM materias_primas WHERE proveedor_id = %s", (prov_id,))
                mps = [r['id'] for r in cursor.fetchall()]
                if mps:
                    placeholders = ", ".join(["%s"] * len(mps))
                    try:
                        cursor.execute(f"DELETE FROM recetas WHERE materia_prima_id IN ({placeholders})", tuple(mps))
                    except Exception:
                        pass
                    try:
                        cursor.execute(f"DELETE FROM ordenes_compra_detalle WHERE materia_prima_id IN ({placeholders})", tuple(mps))
                    except Exception:
                        pass
                    cursor.execute(f"DELETE FROM materias_primas WHERE id IN ({placeholders})", tuple(mps))
                try:
                    cursor.execute("DELETE FROM ordenes_compra WHERE proveedor_id = %s", (prov_id,))
                except Exception:
                    pass
                cursor.execute("DELETE FROM proveedores WHERE id = %s", (prov_id,))
                connection.commit()
                return jsonify({"success": True, "message": "Proveedor eliminado"})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/proveedores:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/materias', methods=['POST', 'DELETE', 'OPTIONS'])
def reg_mat():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'POST':
                d = request.json or {}
                prov_id = d.get('proveedor_id')
                nombre_ins = (d.get('name') or '').strip()
                if not prov_id or not nombre_ins:
                    return jsonify({"success": False, "error": "Proveedor y nombre de insumo requeridos"}), 400

                _insertar_materia_prima(
                    cursor,
                    int(prov_id),
                    nombre_ins,
                    d.get('abc', 'Clase A'),
                    d.get('unidad', 'gramos'),
                    d.get('stock', 1000),
                    d.get('costo', 100)
                )
                connection.commit()
                return jsonify({"success": True})

            elif request.method == 'DELETE':
                mp_id = request.args.get('id')
                if not mp_id:
                    return jsonify({"success": False, "error": "ID de insumo requerido"}), 400
                try:
                    cursor.execute("DELETE FROM recetas WHERE materia_prima_id = %s", (mp_id,))
                except Exception:
                    pass
                try:
                    cursor.execute("DELETE FROM ordenes_compra_detalle WHERE materia_prima_id = %s", (mp_id,))
                except Exception:
                    pass
                cursor.execute("DELETE FROM materias_primas WHERE id = %s", (mp_id,))
                connection.commit()
                return jsonify({"success": True, "message": "Insumo eliminado"})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/materias:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/reabastecer', methods=['POST', 'OPTIONS'])
def crear_orden_reabastecimiento():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        proveedor_id = int(data.get('proveedor_id'))
        items = data.get('items', [])
        estado = data.get('estado', 'Pendiente')
        precio_general = float(data.get('precio_general', 0) or 0)

        if not items:
            return jsonify({"success": False, "error": "Selecciona al menos un insumo"}), 400

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ordenes_compra_detalle (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    orden_compra_id INT NOT NULL,
                    materia_prima_id INT NOT NULL,
                    gramos_solicitados DECIMAL(10,2) NOT NULL,
                    costo_estimado DECIMAL(10,2) DEFAULT 0
                )
            """)

            partes_txt = []
            suma_items = 0.0
            for it in items:
                cant = float(it.get('cantidad') or it.get('gramos') or 0)
                unidad = it.get('unidad') or 'gramos'
                gramos = float(it.get('gramos') or _convertir_a_gramos(cant, unidad))
                subtotal = float(it.get('precio_total') or it.get('costo') or 0)
                suma_items += subtotal
                partes_txt.append(f"{it['nombre']}: {cant} {unidad} (${subtotal:.2f})")

            resumen_txt = ", ".join(partes_txt)
            monto_total = precio_general if precio_general > 0 else suma_items

            cursor.execute("SHOW COLUMNS FROM ordenes_compra")
            cols = {row['Field'] for row in cursor.fetchall()}

            insert_cols = ['proveedor_id']
            insert_vals = [proveedor_id]

            if 'folio' in cols:
                insert_cols.append('folio')
                insert_vals.append(f"OC-{int(time.time()) % 100000}")
            if 'detalle_insumos' in cols:
                insert_cols.append('detalle_insumos')
                insert_vals.append(f"{resumen_txt} | Total: ${monto_total:.2f}")
            elif 'notas' in cols:
                insert_cols.append('notas')
                insert_vals.append(f"{resumen_txt} | Total: ${monto_total:.2f}")
            if 'monto_total' in cols:
                insert_cols.append('monto_total')
                insert_vals.append(monto_total)
            elif 'total' in cols:
                insert_cols.append('total')
                insert_vals.append(monto_total)
            if 'estado' in cols:
                insert_cols.append('estado')
                insert_vals.append(estado)

            placeholders = ", ".join(["%s"] * len(insert_cols))
            cursor.execute(f"INSERT INTO ordenes_compra ({', '.join(insert_cols)}) VALUES ({placeholders})", tuple(insert_vals))
            orden_id = cursor.lastrowid

            for it in items:
                mp_id = int(it['materia_prima_id'])
                cant = float(it.get('cantidad') or it.get('gramos') or 0)
                unidad = it.get('unidad') or 'gramos'
                gramos = float(it.get('gramos') or _convertir_a_gramos(cant, unidad))
                subtotal = float(it.get('precio_total') or it.get('costo') or 0)

                cursor.execute(
                    "INSERT INTO ordenes_compra_detalle (orden_compra_id, materia_prima_id, gramos_solicitados, costo_estimado) VALUES (%s, %s, %s, %s)",
                    (orden_id, mp_id, gramos, subtotal)
                )

                if estado.lower() == 'entregado':
                    _sumar_stock_materia(cursor, mp_id, gramos, cant, unidad)

            cursor.execute(
                "INSERT INTO notificaciones_stock (mensaje) VALUES (%s)",
                (f"Reabastecimiento #{orden_id} ({estado}) por ${monto_total:.2f}: {resumen_txt}",)
            )
            connection.commit()

        return jsonify({"success": True, "orden_id": orden_id})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/reabastecer:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/reabastecer/estado', methods=['PUT', 'OPTIONS'])
def actualizar_estado_reabastecimiento():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        orden_id = int(data.get('id'))
        nuevo_estado = data.get('estado', 'Entregado')

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT estado FROM ordenes_compra WHERE id = %s", (orden_id,))
            actual = cursor.fetchone()
            estado_anterior = (actual.get('estado') or '') if actual else ''

            cursor.execute("UPDATE ordenes_compra SET estado = %s WHERE id = %s", (nuevo_estado, orden_id))

            if nuevo_estado.lower() == 'entregado' and estado_anterior.lower() != 'entregado':
                cursor.execute(
                    "SELECT materia_prima_id, gramos_solicitados FROM ordenes_compra_detalle WHERE orden_compra_id = %s",
                    (orden_id,)
                )
                for d in cursor.fetchall():
                    gramos = float(d['gramos_solicitados'])
                    unidades_extra = round(gramos / 1000.0, 2)
                    cursor.execute("""
                        UPDATE materias_primas
                        SET stock_gramos = stock_gramos + %s,
                            stock_unidades = stock_unidades + %s
                        WHERE id = %s
                    """, (gramos, unidades_extra, int(d['materia_prima_id'])))

                cursor.execute(
                    "INSERT INTO notificaciones_stock (mensaje) VALUES (%s)",
                    (f"Orden #{orden_id} ENTREGADA: Mercancia sumada al inventario.",)
                )

            connection.commit()
        return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/reabastecer/estado:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/cupones/estado', methods=['PUT', 'OPTIONS'])
def toggle_cupon_estado():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        data = request.json or {}
        coupon_id = int(data.get('id'))
        raw_active = data.get('active')
        activo = 1 if (raw_active is True or str(raw_active).lower() in ('1', 'true')) else 0

        connection = get_db_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT codigo, descripcion_descuento FROM cupones_vip WHERE id = %s", (coupon_id,))
            row = cursor.fetchone()
            cursor.execute("UPDATE cupones_vip SET activo = %s WHERE id = %s", (activo, coupon_id))
            if row and activo == 1:
                cursor.execute(
                    "INSERT INTO notificaciones_stock (mensaje) VALUES (%s)",
                    (f"Cupón VIP activo disponible para clientes: {row.get('codigo')} ({row.get('descripcion_descuento')})",)
                )
            elif row and activo == 0:
                cursor.execute(
                    "DELETE FROM notificaciones_stock WHERE mensaje LIKE %s",
                    (f"%Cupón VIP activo disponible para clientes: {row.get('codigo')}%",)
                )
            connection.commit()
        return jsonify({"success": True, "active": bool(activo)})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/cupones/estado:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/cupones', methods=['POST', 'DELETE', 'OPTIONS'])
def gestionar_cupones():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'POST':
                d = request.json or {}
                codigo = (d.get('codigo') or '').strip().upper()
                nivel = (d.get('nivel') or 'Bronce').strip()
                tipo = (d.get('tipo') or 'Descuento').strip()
                valor = (d.get('valor') or '').strip()

                if tipo == 'Regalo en Compra':
                    cond = (d.get('productoCondicion') or '').strip()
                    reg = (d.get('productoRegalo') or '').strip()
                    base_desc = valor or f"Compra {cond} y llévate {reg} GRATIS"
                elif tipo == 'Regalo Gratis':
                    reg = (d.get('productoRegalo') or '').strip()
                    base_desc = valor or f"{reg} GRATIS (Sin compra)"
                else:
                    base_desc = valor or tipo

                desc = f"{base_desc} · Nivel {nivel}"
                min_pedidos = _min_pedidos_por_nivel(nivel)

                cursor.execute(
                    "INSERT INTO cupones_vip (codigo, descripcion_descuento, minimo_pedidos_requeridos, activo) VALUES (%s, %s, %s, 1)",
                    (codigo, desc, min_pedidos)
                )
                cursor.execute(
                    "INSERT INTO notificaciones_stock (mensaje) VALUES (%s)",
                    (f"Cupón VIP activo disponible para clientes: {codigo} ({desc})",)
                )
            elif request.method == 'DELETE':
                cup_id = request.args.get('id')
                cursor.execute("SELECT codigo FROM cupones_vip WHERE id = %s", (cup_id,))
                row = cursor.fetchone()
                cursor.execute("DELETE FROM cupones_vip WHERE id = %s", (cup_id,))
                if row and row.get('codigo'):
                    cursor.execute(
                        "DELETE FROM notificaciones_stock WHERE mensaje LIKE %s",
                        (f"%Cupón VIP activo disponible para clientes: {row.get('codigo')}%",)
                    )
            connection.commit()
        return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/cupones:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/usuarios', methods=['POST', 'DELETE', 'OPTIONS'])
def reg_user():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'POST':
                d = request.json or {}
                correo = (d.get('correo') or '').strip()
                if not correo:
                    return jsonify({"success": False, "error": "Correo requerido"}), 400

                cursor.execute("SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(%s) LIMIT 1", (correo,))
                if cursor.fetchone():
                    return jsonify({"success": False, "error": "Ya existe un usuario con ese correo"}), 400

                rol_str = str(d.get('rol', '')).lower()
                rol_id = 1 if ('admin' in rol_str or rol_str == '1') else 2
                rol_label = 'admin' if rol_id == 1 else 'cocina'
                cursor.execute(
                    """INSERT INTO usuarios
                       (rol_id, nombre, apellido, telefono, correo, direccion, contrasena_hash, fecha_nacimiento, genero, rol)
                       VALUES (%s, %s, %s, %s, %s, %s, '12345', '2000-01-01', 'Otro', %s)""",
                    (
                        rol_id,
                        (d.get('nombre') or 'Personal').strip(),
                        (d.get('apellido') or 'Hanami').strip(),
                        str(d.get('telefono') or '4770000000').strip()[:10],
                        correo,
                        (d.get('direccion') or 'León, Gto.').strip(),
                        rol_label
                    )
                )
            elif request.method == 'DELETE':
                user_id = request.args.get('id')
                if not user_id:
                    return jsonify({"success": False, "error": "ID de usuario requerido"}), 400
                _eliminar_usuario_seguro(cursor, int(user_id), solo_cliente=False)
            connection.commit()
        return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/usuarios:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()


@admin_bp.route('/api/clientes', methods=['POST', 'DELETE', 'OPTIONS'])
def reg_client():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    connection = None
    try:
        connection = get_db_connection()
        with connection.cursor() as cursor:
            if request.method == 'POST':
                d = request.json or {}
                correo = (d.get('correo') or '').strip()
                if not correo:
                    return jsonify({"success": False, "error": "Correo requerido"}), 400

                cursor.execute("SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(%s) LIMIT 1", (correo,))
                if cursor.fetchone():
                    return jsonify({"success": False, "error": "Ya existe un cliente con ese correo"}), 400

                cursor.execute(
                    """INSERT INTO usuarios
                       (rol_id, nombre, apellido, telefono, correo, direccion, contrasena_hash, fecha_nacimiento, genero, rol)
                       VALUES (3, %s, %s, %s, %s, %s, '12345', '2000-01-01', 'Otro', 'cliente')""",
                    (
                        (d.get('nombre') or 'Cliente').strip(),
                        (d.get('apellido') or 'Hanami').strip(),
                        str(d.get('telefono') or '4770000000').strip()[:10],
                        correo,
                        (d.get('direccion') or 'León, Gto.').strip()
                    )
                )
            elif request.method == 'DELETE':
                client_id = request.args.get('id')
                if not client_id:
                    return jsonify({"success": False, "error": "ID de cliente requerido"}), 400
                _eliminar_usuario_seguro(cursor, int(client_id), solo_cliente=True)
            connection.commit()
        return jsonify({"success": True})
    except Exception as e:
        if connection:
            try:
                connection.rollback()
            except Exception:
                pass
        print("Error en /api/clientes:", e)
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            connection.close()