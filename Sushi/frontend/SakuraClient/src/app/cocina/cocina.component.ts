import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ParsedOrderItem {
  qty: number;
  name: string;
  baseIngredients: string;
  extras: string;
  itemNote: string;
}

export interface StockDeductionAlert {
  id: string;
  folio: string;
  summary: string;
  details: string[];
}

export interface RequestedSupplierOrder {
  id: string;
  providerName: string;
  providerId: number;
  createdAtLabel: string;
  status: 'Entregado' | 'No entregado';
  itemsSummary: string;
}

@Component({
  selector: 'app-cocina',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cocina.component.html',
})
export class CocinaComponent implements OnInit, OnDestroy {

  @Input() loggedEmail: string = 'cocina@hanami.com';
  @Output() onLogout = new EventEmitter<void>();

  isSidebarCollapsed: boolean = false;
  showExtraNavItems: boolean = true;

  kitchenSection: string = 'ordenes';
  activeSubTab: string = 'momento';
  activeShiftTab: string = 'matutino';
  selectedHistoryDate: string = this.getTodayDateStr();
  inventorySearchQuery: string = '';

  orders: any[] = [];
  allOrdersForHistory: any[] = [];
  products: any[] = [];
  rawMaterials: any[] = [];
  providers: any[] = [];
  reservasList: any[] = [];
  cortesCajaList: any[] = [];

  stockDeductionAlerts: StockDeductionAlert[] = [];
  requestedSupplierOrders: RequestedSupplierOrder[] = [];

  private deductedOrderFolios: Set<string> = new Set<string>();
  private completedOrderFolios: Set<string> = new Set<string>();
  private printedOrderFolios: Set<string> = new Set<string>();
  private waitingTicketFolios: Set<string> = new Set<string>();
  private removedReservationKeys: Set<string> = new Set<string>();
  private closedCutFoliosByDate: { [dateStr: string]: string[] } = {};
  private previousStockById: { [id: number]: number } = {};

  isSendingCorte: boolean = false;
  corteForm = {
    fecha_corte: this.getTodayDateStr(),
    tipo_corte: 'Diario',
    fondo_inicial: 500,
    efectivo_contado: 500,
    observaciones: ''
  };

  pedidoProveedorForm: {
    proveedor_id: number | null;
    estado: 'Entregado' | 'No entregado';
    seleccionados: { [materiaId: number]: boolean };
    cantidades: { [materiaId: number]: number };
    unidades: { [materiaId: number]: 'kg' | 'gramos' | 'pieza' };
  } = {
    proveedor_id: null,
    estado: 'No entregado',
    seleccionados: {},
    cantidades: {},
    unidades: {}
  };

  salonMesas: any[] = [
    { id: 1, ubicacion: 'Ventana Principal', estado: 'Disponible', clienteActual: '', reservaId: null, reservadoManual: false },
    { id: 2, ubicacion: 'Barra Central', estado: 'Disponible', clienteActual: '', reservaId: null, reservadoManual: false },
    { id: 3, ubicacion: 'Salón Privado', estado: 'Disponible', clienteActual: '', reservaId: null, reservadoManual: false },
    { id: 4, ubicacion: 'Terraza Sakura', estado: 'Disponible', clienteActual: '', reservaId: null, reservadoManual: false }
  ];

  posSelectedOrder: any = null;
  posPaymentMethod: string = 'Efectivo';
  posTransferStatus: 'Recibido' | 'No recibido' = 'Recibido';
  posCashReceived: number = 0;

  mermasList: any[] = [];
  newMerma = { producto: '', motivo: 'Cliente rechazo el producto', comentario: '' };

  showConfirmCancelModal: boolean = false;
  showReasonModal: boolean = false;
  selectedOrderForCancel: any = null;
  cancelReason: string = '';

  private timer: any;

  ngOnInit() {
    this.loadDeductedFoliosFromStorage();
    this.loadCompletedFoliosFromStorage();
    this.loadPrintedFoliosFromStorage();
    this.loadWaitingFoliosFromStorage();
    this.loadRemovedReservationsFromStorage();
    this.loadClosedCutFoliosFromStorage();
    this.loadStockAlertsFromStorage();
    this.loadRequestedSupplierOrdersFromStorage();
    this.loadReservasForKitchen();
    this.cargarInventarioYProveedores(() => {
      this.loadKitchenOrders();
    });
    this.loadProductsForKitchen();
    this.loadMermasFromDatabase();
    this.cargarCortesDeCaja();
    this.timer = setInterval(() => {
      this.loadKitchenOrders();
      this.loadReservasForKitchen();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  toNum(val: any): number {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  getTodayDateStr(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private getReservationKey(r: any): string {
    return `${r?.id ?? ''}|${r?.mesa ?? ''}|${r?.fecha ?? ''}|${r?.horario ?? ''}|${r?.email ?? ''}`;
  }

  private loadClosedCutFoliosFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_closed_cut_folios');
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object') this.closedCutFoliosByDate = parsed;
    } catch {}
  }

  private saveClosedCutFoliosToStorage() {
    try {
      localStorage.setItem('hanami_cocina_closed_cut_folios', JSON.stringify(this.closedCutFoliosByDate));
    } catch {}
  }

  private loadDeductedFoliosFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_deducted_folios');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) this.deductedOrderFolios = new Set(arr.map((f: any) => String(f)));
    } catch {}
  }

  private saveDeductedFoliosToStorage() {
    try {
      localStorage.setItem('hanami_cocina_deducted_folios', JSON.stringify(Array.from(this.deductedOrderFolios)));
    } catch {}
  }

  private loadCompletedFoliosFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_completed_folios');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) this.completedOrderFolios = new Set(arr.map((f: any) => String(f)));
    } catch {}
  }

  private saveCompletedFoliosToStorage() {
    try {
      localStorage.setItem('hanami_cocina_completed_folios', JSON.stringify(Array.from(this.completedOrderFolios)));
    } catch {}
  }

  private loadPrintedFoliosFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_printed_folios');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) this.printedOrderFolios = new Set(arr.map((f: any) => String(f)));
    } catch {}
  }

  private savePrintedFoliosToStorage() {
    try {
      localStorage.setItem('hanami_cocina_printed_folios', JSON.stringify(Array.from(this.printedOrderFolios)));
    } catch {}
  }

  private loadWaitingFoliosFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_waiting_folios');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) this.waitingTicketFolios = new Set(arr.map((f: any) => String(f)));
    } catch {}
  }

  private saveWaitingFoliosToStorage() {
    try {
      localStorage.setItem('hanami_cocina_waiting_folios', JSON.stringify(Array.from(this.waitingTicketFolios)));
    } catch {}
  }

  private loadRemovedReservationsFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_removed_reservations');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) this.removedReservationKeys = new Set(arr.map((k: any) => String(k)));
    } catch {}
  }

  private saveRemovedReservationsToStorage() {
    try {
      localStorage.setItem('hanami_cocina_removed_reservations', JSON.stringify(Array.from(this.removedReservationKeys)));
    } catch {}
  }

  private loadStockAlertsFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_stock_alerts');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) this.stockDeductionAlerts = parsed;
    } catch {}
  }

  private saveStockAlertsToStorage() {
    try {
      localStorage.setItem('hanami_cocina_stock_alerts', JSON.stringify(this.stockDeductionAlerts.slice(0, 15)));
    } catch {}
  }

  private loadRequestedSupplierOrdersFromStorage() {
    try {
      const raw = localStorage.getItem('hanami_cocina_requested_supplier_orders');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) this.requestedSupplierOrders = parsed;
    } catch {}
  }

  private saveRequestedSupplierOrdersToStorage() {
    try {
      localStorage.setItem('hanami_cocina_requested_supplier_orders', JSON.stringify(this.requestedSupplierOrders));
    } catch {}
  }

  loadReservasForKitchen() {
    fetch('http://localhost:5000/api/reservas')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.reservas)) {
          this.reservasList = data.reservas.filter(
            (r: any) => !this.removedReservationKeys.has(this.getReservationKey(r))
          );
          this.aplicarEstadoReservasProximas();
        }
      })
      .catch(() => {});
  }

  private aplicarEstadoReservasProximas() {
    if (!Array.isArray(this.reservasList) || this.reservasList.length === 0) return;

    const now = new Date();
    const todayStr = this.getTodayDateStr();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const r of this.reservasList) {
      const mesaNum = Number(r.mesa);
      const mesaObj = this.salonMesas.find(m => Number(m.id) === mesaNum);
      if (!mesaObj || mesaObj.reservadoManual) continue;

      const fechaRes = String(r.fecha || '').slice(0, 10);
      if (fechaRes !== todayStr) continue;

      const horarioStr = String(r.horario || '');
      const startMatch = horarioStr.match(/^(\d{1,2}):(\d{2})/);
      if (!startMatch) continue;

      const startMinutes = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
      const diffMinutes = startMinutes - currentMinutes;

      if (diffMinutes <= 0 && diffMinutes >= -90) {
        mesaObj.estado = 'Ocupada';
        mesaObj.reservaId = r.id ?? null;
        mesaObj.clienteActual = `${r.email || 'Reserva'} · ${horarioStr} · ${r.personas || 2}p`;
      } else if (diffMinutes > 0 && diffMinutes <= 60) {
        mesaObj.estado = 'Reservada';
        mesaObj.reservaId = r.id ?? null;
        mesaObj.clienteActual = `${r.email || 'Reserva'} · ${horarioStr} · ${r.personas || 2}p`;
      }
    }
  }

  private eliminarReservaAsociada(mesa: any, reserva?: any) {
    const targetReserva =
      reserva ||
      this.reservasList.find(
        r =>
          (mesa?.reservaId && r.id === mesa.reservaId) ||
          Number(r.mesa) === Number(mesa?.id)
      );

    if (!targetReserva) return;

    const key = this.getReservationKey(targetReserva);
    this.removedReservationKeys.add(key);
    this.saveRemovedReservationsToStorage();
    this.reservasList = this.reservasList.filter(r => this.getReservationKey(r) !== key);

    if (targetReserva.id !== undefined && targetReserva.id !== null) {
      fetch(`http://localhost:5000/api/reservas/${targetReserva.id}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  }

  sentarEnMesa(mesa: any, reserva?: any) {
    if (!mesa) return;
    mesa.estado = 'Ocupada';
    mesa.reservadoManual = true;
    if (reserva) {
      mesa.reservaId = reserva.id ?? null;
      mesa.clienteActual = `${reserva.email || 'Reserva'} · ${reserva.horario || ''} · ${reserva.personas || 2}p`;
    } else {
      mesa.reservaId = null;
      mesa.clienteActual = 'Comensales de mesa';
    }

    fetch('http://localhost:5000/api/mesas/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: mesa.id,
        mesa: mesa.id,
        estado: mesa.estado,
        clienteActual: mesa.clienteActual
      })
    }).catch(() => {});
  }

  liberarMesaYQuitarReserva(mesa: any) {
    if (!mesa) return;
    this.eliminarReservaAsociada(mesa);
    mesa.estado = 'Disponible';
    mesa.clienteActual = '';
    mesa.reservaId = null;
    mesa.reservadoManual = false;

    fetch('http://localhost:5000/api/mesas/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: mesa.id,
        mesa: mesa.id,
        estado: mesa.estado,
        clienteActual: mesa.clienteActual
      })
    }).catch(() => {});
  }

  abrirSeccionAbastecimiento() {
    this.kitchenSection = 'abastecimiento';
    this.cargarInventarioYProveedores();
  }

  cargarInventarioYProveedores(onLoaded?: () => void) {
    fetch('http://localhost:5000/api/data')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          this.rawMaterials = (data.rawMaterials || []).map((m: any) => {
            const idNum = Number(m.id);
            const currentStock = Number(m.stock) || 0;
            this.previousStockById[idNum] = currentStock;
            return {
              ...m,
              stock: currentStock,
              stock_minimo: Number(m.stock_minimo) || 0
            };
          });
          this.providers = data.providers || [];
          if (!this.pedidoProveedorForm.proveedor_id && this.providers.length > 0) {
            this.pedidoProveedorForm.proveedor_id = this.providers[0].id;
          }
          this.rawMaterials.forEach(m => {
            if (this.pedidoProveedorForm.cantidades[m.id] === undefined) {
              this.pedidoProveedorForm.cantidades[m.id] = 2;
            }
            if (!this.pedidoProveedorForm.unidades[m.id]) {
              this.pedidoProveedorForm.unidades[m.id] = 'kg';
            }
          });
          this.applyStockDeductionsForNewOrders();
          if (onLoaded) onLoaded();
        }
      })
      .catch(() => {
        if (onLoaded) onLoaded();
      });
  }

  getStockPercentage(mat: any): number {
    const stock = Number(mat?.stock) || 0;
    const min = Number(mat?.stock_minimo) || 0;
    const target = min > 0 ? min * 3 : 10000;
    const pct = Math.round((stock / target) * 100);
    return Math.max(0, Math.min(100, pct));
  }

  getMaxSliderForUnit(unit: 'kg' | 'gramos' | 'pieza'): number {
    if (unit === 'gramos') return 5000;
    if (unit === 'pieza') return 50;
    return 25;
  }

  getSliderRepresentativeIcon(qty: number, unit: 'kg' | 'gramos' | 'pieza'): string {
    const val = Number(qty) || 0;
    const max = this.getMaxSliderForUnit(unit);
    const ratio = max > 0 ? val / max : 0;
    if (ratio >= 0.75) return '🚀';
    if (ratio >= 0.4) return '📦';
    if (ratio >= 0.15) return '⚖️';
    return '🍣';
  }

  private applyStockDeductionsForNewOrders() {
    if (!Array.isArray(this.orders) || this.orders.length === 0 || this.rawMaterials.length === 0) {
      return;
    }

    let changed = false;

    for (const order of this.orders) {
      const folioKey = String(order.folio || '');
      const statusLower = (order.status || '').toLowerCase();
      if (!folioKey || statusLower.includes('cancel') || this.deductedOrderFolios.has(folioKey)) {
        continue;
      }

      const items = this.parseOrderItems(order.itemsText || '');
      const orderDeductionDetails: string[] = [];
      const productNames: string[] = [];

      for (const item of items) {
        productNames.push(`${item.qty}× ${item.name}`);
        const multiplier = Math.max(1, Number(item.qty) || 1);
        const textBlob = `${item.name} ${item.baseIngredients} ${item.extras}`.toLowerCase();

        for (const mat of this.rawMaterials) {
          const matName = (mat.name || '').toLowerCase().trim();
          if (!matName) continue;

          const firstWord = matName.split(/\s+/)[0];
          const matches = textBlob.includes(matName) || (firstWord.length >= 4 && textBlob.includes(firstWord));

          if (matches) {
            const gramosToDeduct = (matName.includes('arroz') ? 120 : 60) * multiplier;
            const prev = Number(mat.stock) || 0;
            mat.stock = Math.max(0, prev - gramosToDeduct);
            this.previousStockById[Number(mat.id)] = mat.stock;
            orderDeductionDetails.push(`${mat.name}: -${gramosToDeduct}g`);
            changed = true;
          }
        }
      }

      this.deductedOrderFolios.add(folioKey);

      if (orderDeductionDetails.length > 0) {
        this.stockDeductionAlerts.unshift({
          id: `${folioKey}_${Date.now()}`,
          folio: folioKey,
          summary: `Se preparó ${productNames.join(', ')}`,
          details: orderDeductionDetails
        });
      }
    }

    if (changed) {
      this.saveDeductedFoliosToStorage();
      this.saveStockAlertsToStorage();
    }
  }

  getInsumosPorProveedorCocina() {
    const provId = Number(this.pedidoProveedorForm.proveedor_id);
    if (!provId) return [];
    return (this.rawMaterials || []).filter(m => Number(m.proveedor_id) === provId);
  }

  onCambioProveedorCocina() {
    this.pedidoProveedorForm.seleccionados = {};
  }

  enviarPedidoProveedorCocina() {
    if (!this.pedidoProveedorForm.proveedor_id) {
      alert('Selecciona un proveedor.');
      return;
    }

    const insumosDistribuidora = this.getInsumosPorProveedorCocina();
    const items = insumosDistribuidora
      .filter(m => this.pedidoProveedorForm.seleccionados[m.id] && Number(this.pedidoProveedorForm.cantidades[m.id]) > 0)
      .map(m => {
        const cantidad = Number(this.pedidoProveedorForm.cantidades[m.id]);
        const unidad = this.pedidoProveedorForm.unidades[m.id] || 'kg';
        const gramos = unidad === 'kg' ? cantidad * 1000 : (unidad === 'pieza' ? cantidad * 100 : cantidad);
        const subtotal = cantidad * Number(m.costo || 100);
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
      alert('Selecciona al menos un insumo de esta distribuidora para pedir.');
      return;
    }

    const selectedProvider = this.providers.find(p => Number(p.id) === Number(this.pedidoProveedorForm.proveedor_id));
    const providerName = selectedProvider ? selectedProvider.nombre_empresa : 'Proveedor';
    const itemsSummary = items.map(i => `${i.nombre} (${i.cantidad} ${i.unidad})`).join(', ');
    const chosenStatus: 'Entregado' | 'No entregado' =
      this.pedidoProveedorForm.estado === 'Entregado' ? 'Entregado' : 'No entregado';

    const newReq: RequestedSupplierOrder = {
      id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
      providerId: Number(this.pedidoProveedorForm.proveedor_id),
      providerName,
      createdAtLabel: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      status: chosenStatus,
      itemsSummary
    };

    this.requestedSupplierOrders.unshift(newReq);
    this.saveRequestedSupplierOrdersToStorage();

    fetch('http://localhost:5000/api/reabastecer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proveedor_id: this.pedidoProveedorForm.proveedor_id,
        estado: chosenStatus === 'Entregado' ? 'Entregado' : 'Pendiente',
        items
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          this.pedidoProveedorForm.seleccionados = {};
          this.cargarInventarioYProveedores();
        }
      })
      .catch(() => {});
  }

  actualizarEstadoPedidoProveedor(req: RequestedSupplierOrder, nuevoEstado: 'Entregado' | 'No entregado') {
    req.status = nuevoEstado;
    this.saveRequestedSupplierOrdersToStorage();
  }

  abrirSeccionCorteCaja() {
    this.kitchenSection = 'corte';
    const resumen = this.getCorteResumen();
    this.corteForm.efectivo_contado = resumen.efectivoEnCaja;
    this.cargarCortesDeCaja();
  }

  cargarCortesDeCaja() {
    fetch('http://localhost:5000/api/cortes-caja')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.cortes)) {
          this.cortesCajaList = data.cortes;
        }
      })
      .catch(() => {});
  }

  getCorteResumen() {
    const source = this.allOrdersForHistory && this.allOrdersForHistory.length > 0
      ? this.allOrdersForHistory
      : this.orders;

    const dateKey = this.corteForm.fecha_corte || this.getTodayDateStr();
    const closedSet = new Set(this.closedCutFoliosByDate[dateKey] || []);

    const ordersOfDay = (source || []).filter(o => {
      const st = (o.status || '').toLowerCase();
      if (st.includes('cancel')) return false;
      const folioKey = String(o.folio || '');
      if (folioKey && closedSet.has(folioKey)) return false;

      const d = this.parseOrderDate(o);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      return dateStr === dateKey;
    });

    let ventasEfectivo = 0;
    let ventasTarjeta = 0;
    let ventasTransferencia = 0;

    for (const o of ordersOfDay) {
      const monto = Number(o.total) || 0;
      const pago = this.getPaymentLabel(o).toLowerCase();
      if (pago.includes('tarj')) {
        ventasTarjeta += monto;
      } else if (pago.includes('transf')) {
        ventasTransferencia += monto;
      } else {
        ventasEfectivo += monto;
      }
    }

    const fondoInicial = Number(this.corteForm.fondo_inicial) || 0;
    const ingresoTotal = fondoInicial + ventasEfectivo + ventasTarjeta + ventasTransferencia;
    const efectivoEnCaja = fondoInicial + ventasEfectivo;

    return {
      numOrdenes: ordersOfDay.length,
      fondoInicial,
      ventasEfectivo,
      ventasTarjeta,
      ventasTransferencia,
      ingresoTotal,
      efectivoEnCaja
    };
  }

  getCorteDiferencia(): number {
    const resumen = this.getCorteResumen();
    const contado = Number(this.corteForm.efectivo_contado) || 0;
    return contado - resumen.efectivoEnCaja;
  }

  enviarCorteAAdministracion() {
    if (this.isSendingCorte) return;
    const resumen = this.getCorteResumen();
    const diferencia = this.getCorteDiferencia();
    const dateKey = this.corteForm.fecha_corte || this.getTodayDateStr();

    const source = this.allOrdersForHistory && this.allOrdersForHistory.length > 0
      ? this.allOrdersForHistory
      : this.orders;

    const foliosToClose = (source || [])
      .filter(o => {
        const st = (o.status || '').toLowerCase();
        if (st.includes('cancel')) return false;
        const d = this.parseOrderDate(o);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === dateKey;
      })
      .map(o => String(o.folio || ''))
      .filter(Boolean);

    this.isSendingCorte = true;

    const payload = {
      fecha_corte: dateKey,
      tipo_corte: this.corteForm.tipo_corte || 'Diario',
      correo: this.loggedEmail || '',
      fondo_inicial: resumen.fondoInicial,
      ventas_efectivo: resumen.ventasEfectivo,
      ventas_tarjeta: resumen.ventasTarjeta,
      ventas_transferencia: resumen.ventasTransferencia,
      ingreso_total: resumen.ingresoTotal,
      efectivo_contado: Number(this.corteForm.efectivo_contado) || 0,
      diferencia,
      observaciones: (this.corteForm.observaciones || '').trim()
    };

    fetch('http://localhost:5000/api/cortes-caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        this.isSendingCorte = false;
        if (data && data.success) {
          const existing = new Set(this.closedCutFoliosByDate[dateKey] || []);
          foliosToClose.forEach(f => existing.add(f));
          this.closedCutFoliosByDate[dateKey] = Array.from(existing);
          this.saveClosedCutFoliosToStorage();

          this.corteForm.observaciones = '';
          this.corteForm.efectivo_contado = resumen.fondoInicial;
          this.cargarCortesDeCaja();
          alert(`Corte de caja #${data.corte_id} enviado a Administración. Caja reiniciada a saldo inicial ($${resumen.fondoInicial.toFixed(2)}).`);
        } else {
          alert(data?.error || 'No se pudo enviar el corte de caja.');
        }
      })
      .catch(() => {
        this.isSendingCorte = false;
        alert('Error de conexión al enviar el corte de caja.');
      });
  }

  private parseOrderDate(o: any): Date {
    const raw = o?.createdAt || o?.fecha || o?.date || o?.created_at;
    if (typeof raw === 'number' && !isNaN(raw)) return new Date(raw);
    if (typeof raw === 'string' && raw.trim()) {
      const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }

  loadKitchenOrders() {
    fetch('http://localhost:5000/api/orders')
      .then(res => res.json())
      .then(data => {
        if (data && data.orders) {
          const normalized = data.orders.map((o: any) => ({
            ...o,
            createdAt: this.parseOrderDate(o).getTime(),
            mesa: o.mesa || null
          }));

          this.allOrdersForHistory = normalized;

          this.orders = normalized.filter((o: any) => {
            const folioKey = String(o.folio || '');
            const st = (o.status || '').toLowerCase();
            const isPrinted = this.printedOrderFolios.has(folioKey);
            if (isPrinted) return false;

            const isWaitingOrCompleted =
              this.waitingTicketFolios.has(folioKey) ||
              this.completedOrderFolios.has(folioKey);
            if (isWaitingOrCompleted) return true;

            const isDeliveredInDb = st === 'entregado' || st.includes('[impreso]');
            return !isDeliveredInDb;
          });

          this.applyStockDeductionsForNewOrders();
          this.sincronizarMesasConOrdenesEnVivo();
        }
      })
      .catch(() => {});
  }

  sincronizarMesasConOrdenesEnVivo() {
    const ordenesActivasMomento = this.orders.filter(o => {
      const tipo = (o.type || '').toLowerCase();
      const status = (o.status || '').toLowerCase();
      return (
        (tipo.includes('momento') || tipo.includes('sucursal')) &&
        !this.completedOrderFolios.has(String(o.folio || '')) &&
        !status.includes('entregado') &&
        !status.includes('completado') &&
        !status.includes('cancelado')
      );
    });

    this.salonMesas.forEach((m, index) => {
      const ordenAsignada = ordenesActivasMomento[index];
      if (ordenAsignada && !m.reservadoManual && m.estado !== 'Disponible') {
        m.estado = 'Ocupada';
        m.clienteActual = ordenAsignada.client || `Comensal Orden #${ordenAsignada.folio}`;
        ordenAsignada.mesa = m.id;
      } else if (ordenAsignada && m.estado === 'Ocupada' && !m.reservadoManual) {
        m.clienteActual = ordenAsignada.client || `Comensal Orden #${ordenAsignada.folio}`;
        ordenAsignada.mesa = m.id;
      } else if (!ordenAsignada && m.estado === 'Ocupada' && !m.reservadoManual) {
        m.estado = 'Disponible';
        m.clienteActual = '';
      }
    });

    this.aplicarEstadoReservasProximas();
  }

  loadProductsForKitchen() {
    fetch('http://localhost:5000/api/data')
      .then(res => res.json())
      .then(data => {
        if (data && data.products) {
          this.products = data.products.map((p: any) => ({
            ...p,
            isAvailable: p.disponible !== 0 && p.disponible !== false
          }));
          if (this.products.length > 0) this.newMerma.producto = this.products[0].name;
        }
      })
      .catch(() => {});
  }

  getFilteredInventoryProducts() {
    const q = (this.inventorySearchQuery || '').trim().toLowerCase();
    if (!q) return this.products;
    return this.products.filter(p => (p.name || '').toLowerCase().includes(q));
  }

  loadMermasFromDatabase() {
    fetch('http://localhost:5000/api/mermas')
      .then(res => res.json())
      .then(data => {
        if (data && data.mermas) this.mermasList = data.mermas;
      })
      .catch(() => {});
  }

  parseOrderItems(itemsText: string): ParsedOrderItem[] {
    if (!itemsText) return [];

    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;
    let bracketDepth = 0;

    for (const ch of itemsText) {
      if (ch === '(') parenDepth++;
      else if (ch === ')' && parenDepth > 0) parenDepth--;
      else if (ch === '[') bracketDepth++;
      else if (ch === ']' && bracketDepth > 0) bracketDepth--;

      if (ch === ',' && parenDepth === 0 && bracketDepth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());

    return parts.map(part => {
      const match = part.match(/^(\d+)x\s+([^(]+)(?:\((.+)\))?$/i);
      const qty = match ? Math.max(1, parseInt(match[1], 10)) : 1;
      const name = (match ? match[2] : part).trim();
      const details = match && match[3] ? match[3].trim() : '';

      let baseIngredients = '';
      let extras = '';
      let itemNote = '';

      if (details) {
        const baseMatch = details.match(/Base:\s*\[([^\]]+)\]/i);
        if (baseMatch) baseIngredients = baseMatch[1].trim();

        const extraMatch = details.match(/Extras:\s*\[([^\]]+)\]/i);
        if (extraMatch) extras = extraMatch[1].trim();

        const noteMatch = details.match(/Nota:\s*([^|]+)/i);
        if (noteMatch) itemNote = noteMatch[1].trim();
      }

      return { qty, name, baseIngredients, extras, itemNote };
    });
  }

  getPaymentLabel(order: any): string {
    const notes = order?.notes || '';
    const match = notes.match(/Pago:\s*([^|]+)/i);
    if (match && match[1].trim()) return match[1].trim();
    return 'Efectivo';
  }

  getDiscountLabel(order: any): string {
    const notes = order?.notes || '';
    const match = notes.match(/(Boleto\s+[^|]+)/i);
    if (match && match[1].trim()) return match[1].trim();
    return '';
  }

  getSpecialNotesOnly(order: any): string {
    const notes = order?.notes || '';
    if (!notes) return '';

    const segments = notes.split('|').map((s: string) => s.trim()).filter(Boolean);
    const filtered = segments.filter((seg: string) => {
      const low = seg.toLowerCase();
      return (
        !low.startsWith('pago:') &&
        !low.startsWith('comprobante:') &&
        !low.startsWith('pendiente enviar comprobante') &&
        !low.startsWith('tarjeta terminación') &&
        !low.startsWith('boleto ') &&
        !low.startsWith('fecha/hora:') &&
        !low.startsWith('dirección:')
      );
    });

    return filtered.join(' · ');
  }

  getActiveLiveOrders() {
    if (!this.orders) return [];
    return this.orders.filter(o => {
      const folioKey = String(o.folio || '');
      const st = (o.status || '').toLowerCase();
      return (
        !this.printedOrderFolios.has(folioKey) &&
        !this.completedOrderFolios.has(folioKey) &&
        !this.waitingTicketFolios.has(folioKey) &&
        !st.includes('entregado') &&
        !st.includes('cancelado')
      );
    });
  }

  getPOSTicketOrders() {
    const baseList = (this.orders && this.orders.length > 0)
      ? this.orders
      : (this.allOrdersForHistory || []);

    const byFolio = new Map<string, any>();
    for (const o of baseList) {
      const fk = String(o?.folio || '');
      if (fk) byFolio.set(fk, o);
    }
    for (const o of (this.allOrdersForHistory || [])) {
      const fk = String(o?.folio || '');
      if (fk && !byFolio.has(fk)) byFolio.set(fk, o);
    }

    return Array.from(byFolio.values()).filter(o => {
      const folioKey = String(o.folio || '');
      const st = (o.status || '').toLowerCase();
      const isTicketReady =
        this.completedOrderFolios.has(folioKey) ||
        this.waitingTicketFolios.has(folioKey) ||
        st === 'completado';
      return (
        !this.printedOrderFolios.has(folioKey) &&
        isTicketReady &&
        !st.includes('cancelado')
      );
    });
  }

  isTicketInWait(order: any): boolean {
    return this.waitingTicketFolios.has(String(order?.folio || ''));
  }

  getMinutesElapsed(orderTime: number): number {
    if (!orderTime) return 0;
    return Math.floor((new Date().getTime() - new Date(orderTime).getTime()) / 60000);
  }

  getOrderHeaderClass(order: any): string {
    const mins = this.getMinutesElapsed(order.createdAt);
    if (mins >= 15) return 'bg-rose-600 text-white';
    if (mins >= 10) return 'bg-amber-500 text-slate-950';
    return 'bg-[#781428] text-amber-100';
  }

  getOrderUrgencyClass(order: any): string {
    const mins = this.getMinutesElapsed(order.createdAt);
    if (mins >= 15) return 'border-rose-500 bg-white';
    if (mins >= 10) return 'border-amber-500 bg-white';
    return 'border-slate-200 bg-white';
  }

  getOrdersByType(typeFilter: string) {
    if (!this.orders) return [];
    return this.orders.filter(o => {
      const t = (o.type || '').toLowerCase();
      if (typeFilter === 'momento') return t.includes('momento') || t.includes('sucursal');
      if (typeFilter === 'programado') return t.includes('programado');
      if (typeFilter === 'uber') return t.includes('uber');
      return false;
    });
  }

  getChannelSubgroup(typeFilter: string, group: 'pendientes' | 'preparados' | 'listos' | 'uber' | 'completados') {
    const list = this.getOrdersByType(typeFilter);
    return list.filter(o => {
      const folioKey = String(o.folio || '');
      if (this.printedOrderFolios.has(folioKey)) return false;

      const isCompleted = this.completedOrderFolios.has(folioKey) || this.waitingTicketFolios.has(folioKey);
      const st = (o.status || '').toLowerCase();
      const isUberEntregado = st.includes('entregado al uber');
      const isListo = st.includes('listo');
      const isPreparado = st.includes('preparad') || st.includes('prep');

      if (group === 'completados') return isCompleted && !isUberEntregado;
      if (isCompleted && !isUberEntregado) return false;

      if (typeFilter === 'momento') {
        if (group === 'pendientes') return !isCompleted;
        return false;
      }

      if (typeFilter === 'programado') {
        if (group === 'pendientes') return !isListo && !isCompleted;
        if (group === 'listos') return isListo && !isCompleted;
        return false;
      }

      if (typeFilter === 'uber') {
        if (group === 'preparados') return isPreparado && !isListo && !isUberEntregado && !isCompleted;
        if (group === 'listos') return isListo && !isUberEntregado && !isCompleted;
        if (group === 'uber') return isUberEntregado && !isCompleted;
        if (group === 'pendientes') return !isPreparado && !isListo && !isUberEntregado && !isCompleted;
      }

      return false;
    });
  }

  getOrdersByShiftAndDate(shift: string) {
    const source = this.allOrdersForHistory && this.allOrdersForHistory.length > 0
      ? this.allOrdersForHistory
      : this.orders;

    if (!source) return [];

    return source.filter(o => {
      const d = this.parseOrderDate(o);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const orderDateStr = `${yyyy}-${mm}-${dd}`;

      const dateMatches = !this.selectedHistoryDate || orderDateStr === this.selectedHistoryDate;
      const hours = d.getHours();
      const shiftMatches = shift === 'matutino'
        ? (hours >= 6 && hours < 14)
        : (hours >= 14 || hours < 6);

      return dateMatches && shiftMatches;
    });
  }

  completeCommandSendToTicket(order: any) {
    const folioKey = String(order.folio || '');
    if (folioKey) {
      this.completedOrderFolios.add(folioKey);
      this.saveCompletedFoliosToStorage();
    }
    order.status = 'Completado';
    this.selectOrderForPOS(order);

    fetch('http://localhost:5000/api/orders/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio: order.folio, status: 'Completado' })
    }).catch(() => {});
  }

  updateOrderStatus(order: any, newStatus: string) {
    order.status = newStatus;

    fetch('http://localhost:5000/api/orders/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio: order.folio, status: newStatus })
    }).catch(() => {});
  }

  selectOrderForPOS(order: any) {
    this.posSelectedOrder = order;
    const detectedPayment = this.getPaymentLabel(order).toLowerCase();
    if (detectedPayment.includes('transf')) {
      this.posPaymentMethod = 'Transferencia';
      this.posTransferStatus = 'Recibido';
    } else if (detectedPayment.includes('tarj')) {
      this.posPaymentMethod = 'Tarjeta';
    } else {
      this.posPaymentMethod = 'Efectivo';
    }
    this.posCashReceived = Number(order.total) || 180;
  }

  getCashChange(): number {
    if (!this.posSelectedOrder) return 0;
    const total = Number(this.posSelectedOrder.total) || 180;
    return this.posCashReceived > total ? this.posCashReceived - total : 0;
  }

  posAction(actionType: string) {
    if (!this.posSelectedOrder) return;
    const currentTicket = this.posSelectedOrder;
    const folioKey = String(currentTicket.folio || '');

    if (actionType === 'cobrar') {
      const extraPaymentDetail =
        this.posPaymentMethod === 'Transferencia'
          ? `Transferencia (${this.posTransferStatus})`
          : this.posPaymentMethod === 'Tarjeta'
            ? 'Tarjeta / Ventanilla'
            : `Efectivo (Cambio: $${this.getCashChange()}.00)`;

      const updatedNotes = (currentTicket.notes || '') + ` | [IMPRESO] POS: ${extraPaymentDetail}`;
      currentTicket.notes = updatedNotes;
      currentTicket.status = 'Entregado';

      if (folioKey) {
        this.printedOrderFolios.add(folioKey);
        this.completedOrderFolios.delete(folioKey);
        this.waitingTicketFolios.delete(folioKey);
        this.savePrintedFoliosToStorage();
        this.saveCompletedFoliosToStorage();
        this.saveWaitingFoliosToStorage();
      }

      const histItem = this.allOrdersForHistory.find(o => String(o.folio || '') === folioKey);
      if (histItem) {
        histItem.status = 'Entregado';
        histItem.notes = updatedNotes;
      }

      this.orders = this.orders.filter(o => String(o.folio || '') !== folioKey);
      this.posSelectedOrder = null;

      fetch('http://localhost:5000/api/orders/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folio: currentTicket.folio, status: 'Entregado', notes: updatedNotes })
      }).catch(() => {});

      alert(`Ticket #${currentTicket.folio} confirmado, impreso y eliminado.`);
    } else if (actionType === 'espera') {
      if (folioKey) {
        this.printedOrderFolios.delete(folioKey);
        this.completedOrderFolios.add(folioKey);
        this.waitingTicketFolios.add(folioKey);
        this.savePrintedFoliosToStorage();
        this.saveCompletedFoliosToStorage();
        this.saveWaitingFoliosToStorage();
      }
      if (!this.orders.some(o => String(o.folio || '') === folioKey)) {
        this.orders = [currentTicket, ...this.orders];
      }
      this.posSelectedOrder = null;
    } else if (actionType === 'cancelar') {
      this.initiateCancelOrder(currentTicket);
      this.posSelectedOrder = null;
    }
  }

  registrarMerma() {
    if (!this.newMerma.comentario.trim()) {
      alert('Por favor ingresa un comentario explicativo para el administrador.');
      return;
    }

    const mermaData = { ...this.newMerma, id: Date.now() };

    fetch('http://localhost:5000/api/mermas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mermaData)
    }).catch(() => {});

    this.mermasList.unshift(mermaData);
    alert('Merma registrada y sincronizada con el panel de Administrador.');
    this.newMerma.comentario = '';
  }

  initiateCancelOrder(order: any) {
    this.selectedOrderForCancel = order;
    this.showConfirmCancelModal = true;
  }

  proceedToReasonModal() {
    this.showConfirmCancelModal = false;
    this.cancelReason = '';
    this.showReasonModal = true;
  }

  confirmOrderCancellation() {
    if (!this.cancelReason.trim() || !this.selectedOrderForCancel) return;
    const folio = this.selectedOrderForCancel.folio;
    const folioKey = String(folio || '');
    this.selectedOrderForCancel.status = 'Cancelado';
    this.selectedOrderForCancel.notes = (this.selectedOrderForCancel.notes || '') + ` | [CANCELADO: ${this.cancelReason}]`;

    if (folioKey) {
      this.printedOrderFolios.add(folioKey);
      this.completedOrderFolios.delete(folioKey);
      this.waitingTicketFolios.delete(folioKey);
      this.savePrintedFoliosToStorage();
      this.saveCompletedFoliosToStorage();
      this.saveWaitingFoliosToStorage();
    }

    fetch('http://localhost:5000/api/orders/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio: folio, status: 'Cancelado', notes: this.selectedOrderForCancel.notes })
    }).then(() => {
      this.loadKitchenOrders();
    }).catch(() => {});

    this.showReasonModal = false;
    this.selectedOrderForCancel = null;
  }

  toggleProductAvailability(product: any) {
    product.isAvailable = !product.isAvailable;
    product.disponible = product.isAvailable ? 1 : 0;
    fetch('http://localhost:5000/api/products/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: product.id, disponible: product.disponible })
    }).catch(() => {});
  }
}