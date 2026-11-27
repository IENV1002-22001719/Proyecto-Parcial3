import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit {
  @Input() loggedEmail: string = '';
  @Input() rawMaterials: any[] = [];
  @Input() products: any[] = [];
  @Input() orders: any[] = [];
  @Input() users: any[] = [];
  @Input() clients: any[] = [];
  @Input() providers: any[] = [];
  @Input() purchaseOrders: any[] = [];
  @Input() coupons: any[] = [];
  @Input() notifications: any[] = [];
  @Input() cortes: any[] = [];

  @Output() onLogout = new EventEmitter<void>();
  @Output() onDataChange = new EventEmitter<void>();

  adminSection: string = 'kpis';
  reportPeriod: string = 'dia';
  trendRange: 'mes' | 'semana' = 'mes';
  inventorySearch: string = '';

  selectedProductIds: number[] = [];

  showNewProviderModal = false;
  agregarInsumosConProveedor = false;
  newProvider: any = {
    nombre_empresa: '',
    contacto: '',
    telefono: '',
    insumo_principal: '',
    insumos: [{ name: '', abc: 'Clase A', unidad: 'kg', cantidad: 5, costo: 150 }]
  };

  showNewIngredientBox = false;
  newIng: { proveedor_id: number | null; name: string; abc: string; unidad: string; stock: number; costo: number } = {
    proveedor_id: null,
    name: '',
    abc: 'Clase A',
    unidad: 'gramos',
    stock: 1000,
    costo: 120
  };

  showDeleteBox = false;
  deleteMode: 'insumo' | 'proveedor' = 'insumo';
  deleteSelectedProviderId: number | null = null;

  showRestockBox = false;
  restockForm: {
    proveedor_id: number | null;
    estado: string;
    seleccionados: { [materiaId: number]: boolean };
    cantidades: { [materiaId: number]: number };
    unidades: { [materiaId: number]: string };
  } = {
    proveedor_id: null,
    estado: 'Pendiente',
    seleccionados: {},
    cantidades: {},
    unidades: {}
  };

  newUser = { nombre: '', apellido: '', correo: '', telefono: '', direccion: '', rol: 'cocina', turno: 'Matutino' };
  employeeShifts = ['Matutino', 'Vespertino', 'Mixto'];
  newClient = { nombre: '', apellido: '', correo: '', telefono: '', direccion: '', nivel_vip: 'Bronce' };

  showModal = false;
  isEditing = false;
  modalProduct: any = { id: null, name: '', price: 150, stock: 10, description: '', image: '', ingredients: [] };

  vipLevels = ['Bronce', 'Plata', 'Oro', 'Platinum', 'Elite'];
  newCoupon = {
    codigo: '',
    tipo: 'Descuento',
    valor: '15%',
    nivel: 'Oro',
    productoRegalo: '',
    productoCondicion: ''
  };

  showToastFlag = false;
  toastMessage = '';

  ngOnInit() {
    this.cargarDatosAdmin();
  }

  cargarDatosAdmin() {
    fetch('http://localhost:5000/api/data')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          this.rawMaterials = (data.rawMaterials || []).map((m: any) => ({
            ...m,
            stock: Number(m.stock) || 0,
            stock_minimo: Number(m.stock_minimo) || 0,
            faltante_produccion_gramos: Number(m.faltante_produccion_gramos) || 0,
            productos_afectados: m.productos_afectados || []
          }));
          this.products = data.products || [];
          this.orders = data.orders || [];
          this.users = data.users || [];
          this.clients = data.clients || [];
          this.providers = data.providers || [];
          this.purchaseOrders = data.purchaseOrders || [];
          this.coupons = (data.coupons || []).map((c: any) => ({
            ...c,
            active: Boolean(c.active)
          }));
          this.notifications = data.notifications || [];
          this.cortes = data.cortes || [];

          if (!this.newIng.proveedor_id && this.providers.length > 0) {
            this.newIng.proveedor_id = Number(this.providers[0].id);
          }
          if (!this.deleteSelectedProviderId && this.providers.length > 0) {
            this.deleteSelectedProviderId = Number(this.providers[0].id);
          }
          if (!this.newCoupon.productoRegalo && this.products.length > 0) {
            this.newCoupon.productoRegalo = this.products[0].name;
            this.newCoupon.productoCondicion = this.products[0].name;
          }
        }
      })
      .catch(err => console.error('Error cargando datos de admin:', err));
  }

  private refrescarTodo() {
    this.cargarDatosAdmin();
    this.onDataChange.emit();
  }

  setAdminSection(section: string) {
    this.adminSection = section;
    if (section === 'inventario' && !this.newIng.proveedor_id && this.providers.length > 0) {
      this.newIng.proveedor_id = Number(this.providers[0].id);
    }
    this.cargarDatosAdmin();
  }

  abrirModalNuevoInsumo(proveedorId?: number) {
    if (proveedorId) {
      this.newIng.proveedor_id = Number(proveedorId);
    } else if (!this.newIng.proveedor_id && this.providers.length > 0) {
      this.newIng.proveedor_id = Number(this.providers[0].id);
    }
    this.showNewIngredientBox = !this.showNewIngredientBox;
    if (this.showNewIngredientBox) {
      this.showNewProviderModal = false;
      this.showRestockBox = false;
      this.showDeleteBox = false;
    }
  }

  abrirModalNuevoProveedor() {
    this.showNewProviderModal = !this.showNewProviderModal;
    if (this.showNewProviderModal) {
      this.showNewIngredientBox = false;
      this.showRestockBox = false;
      this.showDeleteBox = false;
    }
  }

  abrirPanelEliminar() {
    this.showDeleteBox = !this.showDeleteBox;
    if (this.showDeleteBox) {
      this.showNewIngredientBox = false;
      this.showNewProviderModal = false;
      this.showRestockBox = false;
      if (!this.deleteSelectedProviderId && this.providers.length > 0) {
        this.deleteSelectedProviderId = Number(this.providers[0].id);
      }
    }
  }

  getInsumosParaEliminar() {
    if (!this.deleteSelectedProviderId) return [];
    return this.getMaterialsByProvider(this.deleteSelectedProviderId);
  }

  getFilteredInventory() {
    const q = (this.inventorySearch || '').trim().toLowerCase();
    if (!q) return this.rawMaterials || [];
    return (this.rawMaterials || []).filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.proveedor_nombre || '').toLowerCase().includes(q) ||
      (m.abc || '').toLowerCase().includes(q)
    );
  }

  getMaterialsByProvider(providerId: number) {
    return (this.rawMaterials || []).filter(m => Number(m.proveedor_id) === Number(providerId));
  }

  agregarFilaInsumoProveedor() {
    this.newProvider.insumos.push({ name: '', abc: 'Clase A', unidad: 'kg', cantidad: 5, costo: 150 });
  }

  quitarFilaInsumoProveedor(index: number) {
    if (this.newProvider.insumos.length > 1) {
      this.newProvider.insumos.splice(index, 1);
    }
  }

  registrarProveedor() {
    if (!this.newProvider.nombre_empresa || !this.newProvider.nombre_empresa.trim()) {
      this.triggerToast('Ingresa el nombre de la empresa.');
      return;
    }

    const insumosFiltrados = this.agregarInsumosConProveedor
      ? (this.newProvider.insumos || []).filter((i: any) => i.name && String(i.name).trim() !== '')
      : [];

    const payload = {
      nombre_empresa: this.newProvider.nombre_empresa.trim(),
      contacto: this.newProvider.contacto,
      telefono: this.newProvider.telefono,
      insumo_principal: this.newProvider.insumo_principal,
      insumos: insumosFiltrados
    };

    fetch('http://localhost:5000/api/proveedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error al registrar proveedor');
        }
        return data;
      })
      .then(data => {
        this.triggerToast('Proveedor guardado con éxito.');
        this.showNewProviderModal = false;
        this.agregarInsumosConProveedor = false;
        this.newProvider = {
          nombre_empresa: '',
          contacto: '',
          telefono: '',
          insumo_principal: '',
          insumos: [{ name: '', abc: 'Clase A', unidad: 'kg', cantidad: 5, costo: 150 }]
        };
        if (data.proveedor_id) {
          this.newIng.proveedor_id = Number(data.proveedor_id);
          this.deleteSelectedProviderId = Number(data.proveedor_id);
        }
        this.refrescarTodo();
      })
      .catch(err => this.triggerToast(err.message));
  }

  eliminarProveedor(prov: any) {
    if (!prov || !prov.id) return;
    fetch(`http://localhost:5000/api/proveedores?id=${encodeURIComponent(prov.id)}`, {
      method: 'DELETE'
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo eliminar el proveedor.');
        }
        return data;
      })
      .then(() => {
        this.providers = this.providers.filter(p => Number(p.id) !== Number(prov.id));
        this.rawMaterials = this.rawMaterials.filter(m => Number(m.proveedor_id) !== Number(prov.id));
        if (Number(this.newIng.proveedor_id) === Number(prov.id)) {
          this.newIng.proveedor_id = this.providers.length > 0 ? Number(this.providers[0].id) : null;
        }
        if (Number(this.deleteSelectedProviderId) === Number(prov.id)) {
          this.deleteSelectedProviderId = this.providers.length > 0 ? Number(this.providers[0].id) : null;
        }
        this.triggerToast(`Proveedor "${prov.nombre_empresa}" y sus insumos eliminados.`);
        this.refrescarTodo();
      })
      .catch(err => this.triggerToast(err.message));
  }

  guardarInsumo() {
    const provId = this.newIng.proveedor_id || (this.providers.length > 0 ? Number(this.providers[0].id) : null);
    if (!provId || !this.newIng.name || !this.newIng.name.trim()) {
      this.triggerToast('Selecciona proveedor y nombre del insumo.');
      return;
    }

    const payload = {
      proveedor_id: Number(provId),
      name: this.newIng.name.trim(),
      abc: this.newIng.abc || 'Clase A',
      unidad: this.newIng.unidad || 'gramos',
      stock: Number(this.newIng.stock ?? 1000),
      costo: Number(this.newIng.costo ?? 100)
    };

    fetch('http://localhost:5000/api/materias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo guardar el insumo.');
        }
        return data;
      })
      .then(() => {
        this.triggerToast('Insumo registrado.');
        this.showNewIngredientBox = false;
        this.newIng = {
          proveedor_id: Number(provId),
          name: '',
          abc: 'Clase A',
          unidad: 'gramos',
          stock: 1000,
          costo: 120
        };
        this.refrescarTodo();
      })
      .catch(err => this.triggerToast(err.message));
  }

  eliminarInsumo(m: any) {
    if (!m || !m.id) return;
    fetch(`http://localhost:5000/api/materias?id=${encodeURIComponent(m.id)}`, {
      method: 'DELETE'
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo eliminar el insumo.');
        }
        return data;
      })
      .then(() => {
        this.rawMaterials = this.rawMaterials.filter(item => Number(item.id) !== Number(m.id));
        this.triggerToast(`Insumo "${m.name}" eliminado.`);
        this.refrescarTodo();
      })
      .catch(err => this.triggerToast(err.message));
  }

  convertirAGramos(cantidad: number, unidad: string, material?: any): number {
    const u = (unidad || 'gramos').toLowerCase();
    if (u === 'kg' || u === 'litro' || u === 'litros') return cantidad * 1000;
    if (['pieza', 'piezas', 'paquete', 'paquetes', 'costal', 'costales'].includes(u)) {
      const gramosUnidad = Number(material?.peso_unitario_kg || 0) * 1000;
      return cantidad * (gramosUnidad > 0 ? gramosUnidad : 100);
    }
    return cantidad;
  }

  formatoStockConEquivalencia(material: any, gramos: number): string {
    const cantidad = Number(gramos || 0);
    const nombre = String(material?.name || material?.nombre || '');
    const pesoPresentacion = Number(material?.peso_unitario_kg || 0) * 1000;
    const hojas = nombre.match(/paquete\s*(\d+)\s*hojas/i);
    if (hojas && pesoPresentacion > 0) {
      const disponibles = Math.floor((cantidad / pesoPresentacion) * Number(hojas[1]));
      return `${this.formatearCantidad(cantidad)} g (${disponibles} hojas)`;
    }

    const presentacion = this.obtenerPresentacionCompra(material);
    if (pesoPresentacion > 0 && presentacion) {
      const equivalencia = cantidad / pesoPresentacion;
      return `${this.formatearCantidad(cantidad)} g (${this.formatearCantidad(equivalencia)} ${this.etiquetaUnidadCompra(material, equivalencia)})`;
    }
    return `${this.formatearCantidad(cantidad)} g`;
  }

  private formatearCantidad(valor: number): string {
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Number(valor || 0));
  }

  obtenerPresentacionCompra(material: any): string {
    const nombre = String(material?.name || material?.nombre || '');
    const hojas = nombre.match(/paquete\s*(\d+)\s*hojas/i);
    if (hojas) return `Paquete de ${hojas[1]} hojas`;
    const unidad = String(material?.unit || '').toLowerCase();
    if (unidad.includes('costal')) return `Costal de ${this.formatearCantidad(Number(material?.peso_unitario_kg || 25))} kg`;
    if (unidad.includes('litro')) return 'Litro';
    if (unidad.includes('kg') || unidad.includes('kilo')) return 'Kg';
    if (unidad.includes('piez') || unidad.includes('unidad')) return 'Pieza';
    return 'Gramo';
  }

  etiquetaUnidadCompra(material: any, cantidad = 2): string {
    const presentacion = this.obtenerPresentacionCompra(material);
    if (/^Paquete/i.test(presentacion)) return cantidad === 1 ? 'paquete' : 'paquetes';
    if (/^Costal/i.test(presentacion)) return cantidad === 1 ? 'costal' : 'costales';
    if (/^Litro/i.test(presentacion)) return cantidad === 1 ? 'litro' : 'litros';
    if (/^Kg/i.test(presentacion)) return 'kg';
    if (/^Pieza/i.test(presentacion)) return cantidad === 1 ? 'pieza' : 'piezas';
    return cantidad === 1 ? 'gramo' : 'gramos';
  }

  private unidadCompra(material: any): string {
    const presentation = this.obtenerPresentacionCompra(material).toLowerCase();
    if (presentation.startsWith('paquete')) return 'paquete';
    if (presentation.startsWith('costal')) return 'costal';
    if (presentation.startsWith('litro')) return 'litro';
    if (presentation === 'kg') return 'kg';
    if (presentation === 'pieza') return 'pieza';
    return 'gramos';
  }

  abrirReabastecimiento(proveedorId?: number) {
    this.showRestockBox = true;
    this.showNewIngredientBox = false;
    this.showNewProviderModal = false;
    this.showDeleteBox = false;
    this.restockForm = {
      proveedor_id: proveedorId || (this.providers.length > 0 ? Number(this.providers[0].id) : null),
      estado: 'Pendiente',
      seleccionados: {},
      cantidades: {},
      unidades: {}
    };

    this.rawMaterials.forEach(m => {
      this.restockForm.seleccionados[m.id] = false;
      const unidad = this.unidadCompra(m);
      const faltante = Math.max(
        Number(m.faltante_produccion_gramos || 0),
        Number(m.stock_minimo || 0) - Number(m.stock || 0),
        0
      );
      const gramosPorUnidad = this.convertirAGramos(1, unidad, m);
      this.restockForm.cantidades[m.id] = faltante > 0 ? Math.max(1, Math.ceil(faltante / gramosPorUnidad)) : 2;
      this.restockForm.unidades[m.id] = unidad;
    });
  }

  abrirReabastecimientoParaInsumo(material: any) {
    const proveedorId = Number(material?.proveedor_id);
    if (!proveedorId) {
      this.triggerToast('Este insumo no tiene un proveedor asignado.');
      return;
    }
    this.adminSection = 'inventario';
    this.abrirReabastecimiento(proveedorId);
    this.restockForm.seleccionados[Number(material.id)] = true;
  }

  alCambiarProveedorReabastecimiento() {
    this.restockForm.seleccionados = {};
  }

  getInsumosParaReabastecer() {
    if (!this.restockForm.proveedor_id) return [];
    return this.getMaterialsByProvider(this.restockForm.proveedor_id);
  }

  calcularSubtotalItem(m: any): number {
    const cant = Number(this.restockForm.cantidades[m.id] || 0);
    const precioUnit = Number(m.costo || 0);
    return Math.round(cant * precioUnit * 100) / 100;
  }

  calcularPrecioGeneral(): number {
    const candidatos = this.getInsumosParaReabastecer();
    const suma = candidatos
      .filter(m => this.restockForm.seleccionados[m.id])
      .reduce((acc, m) => acc + this.calcularSubtotalItem(m), 0);
    return Math.round(suma * 100) / 100;
  }

  enviarOrdenReabastecimiento() {
    if (!this.restockForm.proveedor_id) {
      this.triggerToast('Selecciona un proveedor.');
      return;
    }

    const candidatos = this.getInsumosParaReabastecer();
    const items = candidatos
      .filter(m => this.restockForm.seleccionados[m.id] && Number(this.restockForm.cantidades[m.id]) > 0)
      .map(m => {
        const cantidad = Number(this.restockForm.cantidades[m.id]);
        const unidad = this.restockForm.unidades[m.id] || this.unidadCompra(m);
        const gramos = this.convertirAGramos(cantidad, unidad, m);
        const subtotal = this.calcularSubtotalItem(m);
        return {
          materia_prima_id: m.id,
          nombre: m.name,
          cantidad,
          unidad,
          gramos,
          precio_total: subtotal
        };
      });

    if (items.length === 0) {
      this.triggerToast('Selecciona al menos un insumo.');
      return;
    }

    const precioGeneral = this.calcularPrecioGeneral();

    fetch('http://localhost:5000/api/reabastecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proveedor_id: this.restockForm.proveedor_id,
        estado: this.restockForm.estado,
        precio_general: precioGeneral,
        items
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast('Orden de reabastecimiento guardada.');
          this.showRestockBox = false;
          this.refrescarTodo();
        } else {
          this.triggerToast('Error al registrar reabastecimiento.');
        }
      });
  }

  cambiarEstadoOrdenCompra(oc: any, nuevoEstado: string) {
    fetch('http://localhost:5000/api/reabastecer/estado', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: oc.id, estado: nuevoEstado })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast(`Orden #${oc.id} marcada como ${nuevoEstado}.`);
          this.refrescarTodo();
        }
      });
  }

  toggleProductSelection(id: number) {
    const idx = this.selectedProductIds.indexOf(id);
    if (idx > -1) this.selectedProductIds.splice(idx, 1);
    else this.selectedProductIds.push(id);
  }

  toggleIngredientSelection(ingName: string) {
    if (!Array.isArray(this.modalProduct.ingredients)) {
      this.modalProduct.ingredients = [];
    }
    const idx = this.modalProduct.ingredients.indexOf(ingName);
    if (idx > -1) {
      this.modalProduct.ingredients.splice(idx, 1);
    } else {
      this.modalProduct.ingredients.push(ingName);
    }
  }

  isIngredientSelected(ingName: string): boolean {
    return Array.isArray(this.modalProduct.ingredients) && this.modalProduct.ingredients.includes(ingName);
  }

  eliminarProducto(p: any) {
    fetch(`http://localhost:5000/api/productos?id=${p.id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast(`Platillo ${p.name} eliminado.`);
          this.selectedProductIds = this.selectedProductIds.filter(id => id !== p.id);
          this.refrescarTodo();
        }
      });
  }

  eliminarPlatillosSeleccionados() {
    if (this.selectedProductIds.length === 0) {
      this.triggerToast('Selecciona al menos un platillo.');
      return;
    }
    Promise.all(
      this.selectedProductIds.map(id =>
        fetch(`http://localhost:5000/api/productos?id=${id}`, { method: 'DELETE' })
      )
    ).then(() => {
      this.triggerToast('Platillos seleccionados eliminados.');
      this.selectedProductIds = [];
      this.refrescarTodo();
    });
  }

  openNewProductModal() {
    this.isEditing = false;
    this.modalProduct = { id: null, name: '', price: 150, stock: 10, description: '', image: '', ingredients: [] };
    this.showModal = true;
  }

  openEditProductModal(p: any) {
    this.isEditing = true;
    this.modalProduct = {
      ...p,
      ingredients: Array.isArray(p.ingredients) ? [...p.ingredients] : []
    };
    this.showModal = true;
  }

  saveModalProduct() {
    const method = this.isEditing ? 'PUT' : 'POST';
    fetch('http://localhost:5000/api/productos', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.modalProduct)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast('Platillo guardado correctamente.');
          this.showModal = false;
          this.refrescarTodo();
        }
      });
  }

  registrarUsuario() {
    const telefono = String(this.newUser.telefono || '').replace(/\D/g, '');
    if (!this.newUser.nombre.trim() || !this.newUser.correo.trim() || telefono.length !== 10) {
      this.triggerToast('Ingresa nombre, correo y un teléfono de 10 dígitos.');
      return;
    }
    fetch('http://localhost:5000/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.newUser)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast('Personal registrado.');
          this.newUser = { nombre: '', apellido: '', correo: '', telefono: '', direccion: '', rol: 'cocina', turno: 'Matutino' };
          this.refrescarTodo();
        }
      });
  }

  eliminarUsuario(u: any) {
    fetch(`http://localhost:5000/api/usuarios?id=${u.id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast('Usuario eliminado.');
          this.refrescarTodo();
        }
      });
  }

  registrarCliente() {
    if (!this.newClient.nombre || !this.newClient.correo) {
      this.triggerToast('Ingresa nombre y correo del cliente.');
      return;
    }
    fetch('http://localhost:5000/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.newClient)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast('Cliente registrado.');
          this.newClient = { nombre: '', apellido: '', correo: '', telefono: '', direccion: '', nivel_vip: 'Bronce' };
          this.refrescarTodo();
        }
      });
  }

  eliminarCliente(c: any) {
    fetch(`http://localhost:5000/api/clientes?id=${c.id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast('Cliente eliminado.');
          this.refrescarTodo();
        }
      });
  }

  onCouponTypeChange() {
    const fallbackProd = this.products[0]?.name || 'Roll Especial Hanami';
    if (this.newCoupon.tipo === 'Regalo en Compra') {
      this.newCoupon.productoCondicion = this.newCoupon.productoCondicion || fallbackProd;
      this.newCoupon.productoRegalo = this.newCoupon.productoRegalo || fallbackProd;
      this.newCoupon.valor = `Compra ${this.newCoupon.productoCondicion} y llévate ${this.newCoupon.productoRegalo} GRATIS`;
    } else if (this.newCoupon.tipo === 'Regalo Gratis') {
      this.newCoupon.productoRegalo = this.newCoupon.productoRegalo || fallbackProd;
      this.newCoupon.valor = `${this.newCoupon.productoRegalo} GRATIS (Sin compra)`;
    } else if (this.newCoupon.tipo === 'Envío Gratis') {
      this.newCoupon.valor = 'Envío Gratis';
    } else {
      this.newCoupon.valor = '15%';
    }
  }

  createCoupon() {
    if (!this.newCoupon.codigo) {
      this.triggerToast('Ingresa el código del cupón.');
      return;
    }
    this.onCouponTypeChange();

    fetch('http://localhost:5000/api/cupones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.newCoupon)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.triggerToast(`Cupón ${this.newCoupon.codigo} (${this.newCoupon.nivel}) activado para clientes.`);
          this.newCoupon = {
            codigo: '',
            tipo: 'Descuento',
            valor: '15%',
            nivel: 'Oro',
            productoRegalo: this.products[0]?.name || '',
            productoCondicion: this.products[0]?.name || ''
          };
          this.refrescarTodo();
        }
      });
  }

  toggleCouponStatus(coup: any) {
    const nuevoEstado = !coup.active;
    coup.active = nuevoEstado;

    fetch('http://localhost:5000/api/cupones/estado', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coup.id, active: nuevoEstado })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          coup.active = Boolean(data.active);
          this.triggerToast(
            coup.active
              ? `Cupón ${coup.code} activado y visible para clientes.`
              : `Cupón ${coup.code} desactivado: ya no aparece en barras ni notificaciones del cliente.`
          );
          this.refrescarTodo();
        } else {
          coup.active = !nuevoEstado;
        }
      })
      .catch(() => {
        coup.active = !nuevoEstado;
      });
  }

  deleteCoupon(coup: any) {
    fetch(`http://localhost:5000/api/cupones?id=${coup.id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.coupons = this.coupons.filter(c => c.id !== coup.id);
          this.triggerToast(`Cupón ${coup.code} eliminado.`);
          this.refrescarTodo();
        }
      });
  }

  // ==========================================================
  // FÓRMULAS KPI REALES + PREDICCIONES (HOY VIERNES NOVIEMBRE)
  // ==========================================================
  private getFilteredOrdersByPeriod() {
    const valid = (this.orders || []).filter(o => o.status !== 'Cancelado');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentMonthStr = todayStr.slice(0, 7);

    if (this.reportPeriod === 'dia') {
      const todayOrders = valid.filter(o => String(o.createdAt || '').slice(0, 10) === todayStr);
      return todayOrders.length > 0 ? todayOrders : valid;
    }
    if (this.reportPeriod === 'semana') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekOrders = valid.filter(o => {
        const d = new Date(String(o.createdAt || '').replace(' ', 'T'));
        return !isNaN(d.getTime()) && d >= sevenDaysAgo;
      });
      return weekOrders.length > 0 ? weekOrders : valid;
    }
    if (this.reportPeriod === 'mes') {
      const monthOrders = valid.filter(o => String(o.createdAt || '').slice(0, 7) === currentMonthStr);
      return monthOrders.length > 0 ? monthOrders : valid;
    }
    return valid;
  }

  getTotalSales(): number {
    const list = this.getFilteredOrdersByPeriod();
    return Math.round(list.reduce((acc, o) => acc + Number(o.total || 0), 0));
  }

  getEstimatedCosts(): number {
    const compras = (this.purchaseOrders || [])
      .reduce((acc, oc) => acc + Number(oc.monto_total || 0), 0);
    return Math.round(compras);
  }

  getNetProfit(): number {
    return this.getTotalSales() - this.getEstimatedCosts();
  }

  getGrossMarginPct(): number {
    const sales = this.getTotalSales();
    if (sales <= 0) return 0;
    return Math.round(((sales - this.getEstimatedCosts()) / sales) * 100);
  }

  getAverageTicket(): number {
    const validOrders = this.getFilteredOrdersByPeriod();
    if (validOrders.length === 0) return 0;
    const sum = validOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    return Math.round(sum / validOrders.length);
  }

  getNovemberPrediction(): number {
    const totalRealVentas = (this.orders || [])
      .filter(o => o.status !== 'Cancelado')
      .reduce((acc, o) => acc + Number(o.total || 0), 0);
    const comprasReales = this.getEstimatedCosts();
    const ticket = this.getAverageTicket();
    return Math.round(totalRealVentas * 1.25 + comprasReales * 0.35 + ticket * 1.5);
  }

  // SOLO PLATILLOS REALES DEL CATÁLOGO (NO INGREDIENTES)
  getTopSellingProductsChart() {
    const counts: { [name: string]: number } = {};
    const catalogNames = (this.products || []).map(p => String(p.name || '').trim()).filter(Boolean);
    const ingredientNames = new Set((this.rawMaterials || []).map(m => String(m.name || '').trim().toLowerCase()));

    for (const o of this.getFilteredOrdersByPeriod()) {
      const text = String(o.itemsText || '');
      const segments = text.split(',').map(s => s.trim()).filter(Boolean);

      for (const seg of segments) {
        const match = seg.match(/^(\d+)x\s+([^(]+)/i);
        const qty = match ? Math.max(1, parseInt(match[1], 10)) : 1;
        const rawName = (match ? match[2] : seg).trim();
        if (!rawName) continue;

        const matchedProd = catalogNames.find(
          pn => pn.toLowerCase() === rawName.toLowerCase() || rawName.toLowerCase().includes(pn.toLowerCase())
        );

        if (matchedProd) {
          counts[matchedProd] = (counts[matchedProd] || 0) + qty;
        } else if (!ingredientNames.has(rawName.toLowerCase()) && catalogNames.length > 0) {
          // Si no es ingrediente conocido, lo contamos como platillo vendido
          counts[rawName] = (counts[rawName] || 0) + qty;
        }
      }
    }

    const list = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    if (list.length === 0) return [];

    const maxVal = Math.max(1, ...list.map(i => i.value));
    const palette = ['#781428', '#B45309', '#047857', '#1D4ED8', '#6D28D9'];

    return list.map((item, idx) => ({
      label: item.label,
      value: item.value,
      pct: Math.min(100, Math.max(14, Math.round((item.value / maxVal) * 100))),
      color: palette[idx % palette.length]
    }));
  }

  getRevenueByChannelChart() {
    let sucursal = 0;
    let uber = 0;
    let programado = 0;

    for (const o of this.getFilteredOrdersByPeriod()) {
      const t = String(o.type || '').toLowerCase();
      const total = Number(o.total || 0);
      if (t.includes('uber')) uber += total;
      else if (t.includes('programado')) programado += total;
      else sucursal += total;
    }

    const data = [
      { label: 'Al Momento ($)', value: Math.round(sucursal), color: '#781428' },
      { label: 'Uber Eats ($)', value: Math.round(uber), color: '#D97706' },
      { label: 'Programado ($)', value: Math.round(programado), color: '#059669' }
    ];

    const maxVal = Math.max(1, ...data.map(d => d.value));
    return data.map(d => ({
      ...d,
      pct: d.value > 0 ? Math.min(100, Math.max(12, Math.round((d.value / maxVal) * 100))) : 4
    }));
  }

  getSalesLineSeries(): { label: string; value: number; x: number; y: number; predicted?: boolean }[] {
    const validOrders = (this.orders || []).filter(o => o.status !== 'Cancelado');
    const dailyMap: { [key: string]: number } = {};

    for (const o of validOrders) {
      const dateStr = String(o.createdAt || '').slice(0, 10);
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        dailyMap[dateStr.slice(5, 10)] = (dailyMap[dateStr.slice(5, 10)] || 0) + Number(o.total || 0);
      }
    }

    let pointsData: { label: string; value: number; predicted?: boolean }[] = [];

    if (this.trendRange === 'mes') {
      const realEntries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0]));
      let acumulado = 0;
      if (realEntries.length > 0) {
        pointsData = realEntries.map(([k, v]) => {
          acumulado += v;
          return { label: k, value: Math.round(acumulado), predicted: false };
        });
      } else {
        pointsData = [{ label: 'Hoy (Vie)', value: 0, predicted: false }];
      }
      const predNov = this.getNovemberPrediction();
      pointsData.push({ label: 'Pred. Sáb', value: Math.round(predNov * 0.6), predicted: true });
      pointsData.push({ label: 'Pred. Nov', value: predNov, predicted: true });
    } else {
      const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const counts = new Array(7).fill(0);
      for (const o of validOrders) {
        const d = new Date(`${String(o.createdAt || '').slice(0, 10)}T12:00:00`);
        if (!isNaN(d.getTime())) {
          const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
          counts[idx] += Number(o.total || 0);
        }
      }
      const hasAny = counts.some(v => v > 0);
      const basePred = hasAny
        ? Math.max(...counts.filter(v => v > 0))
        : (this.getAverageTicket() || this.getEstimatedCosts() || 0);

      pointsData = days.map((d, idx) => {
        if (hasAny || idx <= 4) {
          return { label: d, value: Math.round(counts[idx]), predicted: false };
        }
        const factor = idx === 5 ? 1.25 : 1.45;
        return { label: `Pred. ${d}`, value: Math.round(basePred * factor), predicted: true };
      });
    }

    const maxVal = Math.max(1, ...pointsData.map(p => p.value));
    const width = 520;
    const height = 160;
    const padX = 36;
    const padY = 22;

    return pointsData.map((p, i) => {
      const x = pointsData.length === 1
        ? width / 2
        : padX + (i * (width - padX * 2)) / (pointsData.length - 1);
      const y = height - padY - ((p.value / maxVal) * (height - padY * 2));
      return {
        label: p.label,
        value: p.value,
        x: Math.round(x),
        y: Math.round(y),
        predicted: p.predicted
      };
    });
  }

  getSalesLinePolyline(): string {
    return this.getSalesLineSeries().map(p => `${p.x},${p.y}`).join(' ');
  }

  getMonthlyComparisonChart() {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const totals = new Array(12).fill(0);

    for (const o of (this.orders || [])) {
      if (o.status === 'Cancelado') continue;
      const match = String(o.createdAt || '').match(/^\d{4}-(\d{2})-/);
      if (match) {
        const mIdx = parseInt(match[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          totals[mIdx] += Number(o.total || 0);
        }
      }
    }

    const predNov = this.getNovemberPrediction();
    const values = months.map((label, idx) => {
      const realVal = Math.round(totals[idx]);
      const isNov = idx === 10;
      const val = isNov && predNov > realVal ? predNov : realVal;
      return {
        label: isNov && predNov > realVal ? 'Nov (Pred.)' : label,
        value: val,
        color: isNov ? '#781428' : '#047857'
      };
    });

    const maxVal = Math.max(1, ...values.map(v => v.value));
    return values.map(v => ({
      ...v,
      pct: v.value > 0 ? Math.min(100, Math.max(12, Math.round((v.value / maxVal) * 100))) : 3
    }));
  }

  getBestSellingMonthLabel(): string {
    const list = this.getMonthlyComparisonChart();
    const best = [...list].sort((a, b) => b.value - a.value)[0];
    if (!best || best.value === 0) return 'Nov (En curso)';
    return `${best.label} ($${best.value})`;
  }

  getWeekdayTrafficChart() {
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const counts = new Array(7).fill(0);

    for (const o of (this.orders || [])) {
      if (o.status === 'Cancelado') continue;
      const dateStr = String(o.createdAt || '').slice(0, 10);
      const parsed = new Date(`${dateStr}T12:00:00`);
      if (!isNaN(parsed.getTime())) {
        const idx = parsed.getDay() === 0 ? 6 : parsed.getDay() - 1;
        counts[idx] += 1;
      }
    }

    const totalRealOrders = counts.reduce((a, b) => a + b, 0);
    const items = labels.map((label, idx) => {
      const isFutureWeekend = idx >= 5 && counts[idx] === 0;
      const predVal = totalRealOrders > 0
        ? Math.round(totalRealOrders * (idx === 5 ? 1.3 : 1.5))
        : 0;

      return {
        label: isFutureWeekend ? `Pred. ${label}` : label,
        value: isFutureWeekend ? predVal : counts[idx],
        color: isFutureWeekend ? '#D97706' : (idx >= 4 ? '#781428' : '#0284C7')
      };
    });

    const maxVal = Math.max(1, ...items.map(i => i.value));
    return items.map(i => ({
      ...i,
      pct: i.value > 0 ? Math.min(100, Math.max(12, Math.round((i.value / maxVal) * 100))) : 4
    }));
  }

  getBusiestDayLabel(): string {
    const list = this.getWeekdayTrafficChart();
    const realOnly = list.filter(i => !i.label.startsWith('Pred.'));
    const topReal = [...realOnly].sort((a, b) => b.value - a.value)[0];
    if (topReal && topReal.value > 0) {
      return `${topReal.label} (${topReal.value} ped.)`;
    }
    return 'Pred. Sáb / Dom';
  }

  getShiftSalesChart() {
    let matutino = 0;
    let vespertino = 0;

    for (const o of this.getFilteredOrdersByPeriod()) {
      const total = Number(o.total || 0);
      const match = String(o.createdAt || '').match(/\b(\d{1,2}):\d{2}/);
      if (match) {
        const hour = parseInt(match[1], 10);
        if (hour >= 6 && hour < 14) matutino += total;
        else vespertino += total;
      } else {
        vespertino += total;
      }
    }

    const data = [
      { label: 'Matutino (6:00 - 14:00)', value: Math.round(matutino), color: '#D97706' },
      { label: 'Vespertino (14:00 - 06:00)', value: Math.round(vespertino), color: '#781428' }
    ];

    const maxVal = Math.max(1, ...data.map(d => d.value));
    return data.map(d => ({
      ...d,
      pct: d.value > 0 ? Math.min(100, Math.max(15, Math.round((d.value / maxVal) * 100))) : 5
    }));
  }

  getStockBarItems() {
    const items = this.rawMaterials || [];
    const maxGramos = Math.max(1000, ...items.map(m => Number(m.stock || 0)));
    return items.map(m => ({
      name: m.name,
      stock: Number(m.stock || 0),
      minimo: Number(m.stock_minimo || 0),
      isLow: Number(m.stock || 0) <= Number(m.stock_minimo || 0),
      pct: Math.min(100, Math.max(6, Math.round((Number(m.stock || 0) / maxGramos) * 100)))
    }));
  }

  getStockHealthMetrics() {
    const total = (this.rawMaterials || []).length;
    const criticos = (this.rawMaterials || []).filter(m => Number(m.stock) <= Number(m.stock_minimo) || Number(m.faltante_produccion_gramos || 0) > 0).length;
    const optimos = Math.max(0, total - criticos);
    return {
      total,
      criticos,
      optimos,
      pctOptimo: total > 0 ? Math.round((optimos / total) * 100) : 100
    };
  }

  getStockNeedsRestock(): any[] {
    const materials = this.rawMaterials || [];
    const low = materials.filter((m: any) => Number(m.stock || 0) <= Number(m.stock_minimo || 0));
    const recipeWarnings = materials.filter((m: any) => Number(m.faltante_produccion_gramos || 0) > 0);
    return [...new Map([...low, ...recipeWarnings].map((m: any) => [Number(m.id), m])).values()];
  }

  getPendingPurchaseOrders(): number {
    return (this.purchaseOrders || []).filter((order: any) =>
      String(order.estado || '').toLowerCase() !== 'entregado'
    ).length;
  }

  triggerToast(msg: string) {
    this.toastMessage = msg;
    this.showToastFlag = true;
    setTimeout(() => { this.showToastFlag = false; }, 3500);
  }
}
