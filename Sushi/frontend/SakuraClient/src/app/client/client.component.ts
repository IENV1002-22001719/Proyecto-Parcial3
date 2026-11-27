import { Component, EventEmitter, Output, Input, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client.component.html',
})
export class ClientViewComponent implements OnInit, OnChanges, OnDestroy {

  @Input() loggedEmail: string = '';
  @Input() isGuest: boolean = true;
  @Input() products: any[] = [];
  @Input() rawMaterials: any[] = [];
  @Input() orders: any[] = [];
  @Input() users: any[] = [];
  @Input() notificationLog: any[] = [];

  @Output() onLogout = new EventEmitter<void>();
  @Output() onDataChange = new EventEmitter<void>();
  @Output() onRequireLogin = new EventEmitter<string>();

  clientSection: string = 'inicio';
  orderTab: string = 'proceso';
  showBagDrawer: boolean = false;
  showCheckoutModal: boolean = false;
  showOrderNotifications: boolean = false;
  orderStatusNotifications: any[] = [];
  private knownOrderStatuses = new Map<string, string>();
  private orderStatusSnapshotReady = false;
  private orderPollingTimer: any = null;
  private notificationAccount = '';

  // Filtros del Menú a la Carta
  menuSearchQuery: string = '';
  selectedCategory: string = 'Todos';
  quickChip: 'todos' | 'populares' | 'salmon' | 'tempura' = 'todos';
  filterNoRaw: boolean = false;
  filterVeggie: boolean = false;
  filterSpicy: boolean = false;

  // Carrusel de platillos destacados en Inicio
  featuredIndex: number = 0;

  userProfile = {
    name: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  };

  userAddresses: any[] = [];
  newAddressLabel: string = '';
  newAddressFull: string = '';
  selectedAddress: string = '';

  cart: any[] = [];
  deliveryMode: string = 'momento';
  scheduledDate: string = '';
  paymentMethod: string = 'Transferencia';

  // Pago por Transferencia
  transferReceiptFileName: string = '';
  transferReceiptPreview: string = '';

  // Pago por Tarjeta
  cardHolderName: string = '';
  cardNumber: string = '';
  cardExpiry: string = '';
  cardCvv: string = '';
  isProcessingCard: boolean = false;
  isSubmittingOrder: boolean = false;
  cardStatusMessage: string = '';
  cardStatusType: 'success' | 'error' | '' = '';

  // Cupones / Boletos (un solo uso por usuario, sincronizados con BD)
  appliedCoupon: any = null;
  couponInputCode: string = '';
  redeemedCouponCodes: string[] = [];
  private dbCoupons: any[] = [];
  private backendCompletedOrders: number | null = null;
  private backendTierName: string = '';
  private ingredientsByProductId: Record<string, string[]> = {};

  clientAllergies: string = '';
  clientIsUrgent: boolean = false;

  misReservas: any[] = [];
  newReservation = { fecha: '', horario: '', personas: 2, mesa: '1' };

  availableRewards: any[] = [];

  showCustomizeModal: boolean = false;
  selectedProduct: any = null;
  customQty: number = 1;
  customNotes: string = '';
  modifiableIngredients: any[] = [];
  extraToppings: any[] = [
    { name: 'Queso Crema Extra', price: 20, selected: false },
    { name: 'Aguacate Extra', price: 25, selected: false },
    { name: 'Salsa Tampico', price: 18, selected: false },
    { name: 'Chile Toreado', price: 15, selected: false }
  ];

  showToastFlag: boolean = false;
  toastMessage: string = '';

  ngOnInit() {
    this.orders = [];
    this.misReservas = [];
    this.restorePendingCartIfLoggedIn();
    this.loadUserProfile();
    this.loadClientCouponsFromDatabase();
    this.loadProductsFromDatabase();
    this.loadOrdersFromDatabase();
    this.loadSecondaryAddressesFromDatabase();
    this.loadReservasFromDatabase();
    this.notificationAccount = (this.loggedEmail || '').toLowerCase().trim();
    this.startOrderStatusPolling();
  }

  ngOnDestroy() {
    if (this.orderPollingTimer) clearInterval(this.orderPollingTimer);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['loggedEmail'] || changes['isGuest']) {
      const account = (this.loggedEmail || '').toLowerCase().trim();
      if (account !== this.notificationAccount) {
        this.notificationAccount = account;
        this.knownOrderStatuses.clear();
        this.orderStatusNotifications = [];
        this.orderStatusSnapshotReady = false;
        this.showOrderNotifications = false;
      }
      this.startOrderStatusPolling();
    }
    if (changes['loggedEmail'] || changes['isGuest'] || changes['users']) {
      this.restorePendingCartIfLoggedIn();
      this.loadUserProfile();
      this.loadClientCouponsFromDatabase();

      if (!this.isAuthenticatedClient() && (this.clientSection === 'pedidos' || this.clientSection === 'reservas' || this.clientSection === 'rewards' || this.clientSection === 'perfil')) {
        this.clientSection = 'inicio';
      }

      if ((changes['loggedEmail'] || changes['isGuest']) && this.isAuthenticatedClient()) {
        this.loadOrdersFromDatabase();
        this.loadSecondaryAddressesFromDatabase();
        this.loadReservasFromDatabase();
      }
    }
    if (changes['products'] && Array.isArray(this.products) && this.products.length > 0) {
      this.products = this.products.map((p: any) => ({
        ...p,
        ingredients: this.extractIngredientsFromProduct(p)
      }));
      if (this.featuredIndex >= this.products.length) {
        this.featuredIndex = 0;
      }
    }
    if (changes['orders']) {
      if (this.isAuthenticatedClient()) {
        this.loadOrdersFromDatabase();
      } else {
        this.loadClientCouponsFromDatabase();
      }
    }
  }

  // Métodos para filtrado del Menú a la Carta
  getMenuCategories(): string[] {
    const list = Array.isArray(this.products) ? this.products : [];
    const cats = list
      .map((p: any) => String(p?.category || '').trim())
      .filter(Boolean);
    return Array.from(new Set(cats));
  }

  getFilteredMenuProducts(): any[] {
    const list = Array.isArray(this.products) ? this.products : [];
    const q = (this.menuSearchQuery || '').trim().toLowerCase();

    return list.filter((p: any, index: number) => {
      const name = String(p?.name || '').toLowerCase();
      const desc = String(p?.description || '').toLowerCase();
      const cat = String(p?.category || '').toLowerCase();
      const ings = Array.isArray(p?.ingredients)
        ? p.ingredients.join(' ').toLowerCase()
        : String(p?.ingredients || '').toLowerCase();
      const combined = `${name} ${desc} ${cat} ${ings}`;

      if (this.selectedCategory && this.selectedCategory !== 'Todos') {
        if (String(p?.category || '').trim() !== this.selectedCategory) {
          return false;
        }
      }

      if (q && !combined.includes(q)) {
        return false;
      }

      if (this.quickChip === 'populares') {
        const isPop = index < 4 || Boolean(p?.popular || p?.destacado);
        if (!isPop) return false;
      } else if (this.quickChip === 'salmon') {
        if (!combined.includes('salm')) return false;
      } else if (this.quickChip === 'tempura') {
        if (!combined.includes('tempura')) return false;
      }

      if (this.filterNoRaw) {
        if (combined.includes('crudo') || combined.includes('sashimi') || combined.includes('ceviche')) {
          return false;
        }
      }

      if (this.filterVeggie) {
        if (!combined.includes('vegetal') && !combined.includes('veggie') && !combined.includes('aguacate') && !combined.includes('pepino')) {
          return false;
        }
      }

      if (this.filterSpicy) {
        if (!combined.includes('picante') && !combined.includes('chile') && !combined.includes('sriracha') && !combined.includes('habanero')) {
          return false;
        }
      }

      return true;
    });
  }

  resetMenuFilters(): void {
    this.menuSearchQuery = '';
    this.selectedCategory = 'Todos';
    this.quickChip = 'todos';
    this.filterNoRaw = false;
    this.filterVeggie = false;
    this.filterSpicy = false;
  }

  // Métodos para el carrusel de platillos destacados en Inicio
  getFeaturedList(): any[] {
    return Array.isArray(this.products) ? this.products : [];
  }

  getFeaturedProduct(): any {
    const list = this.getFeaturedList();
    if (!list.length) return {};
    return list[this.featuredIndex % list.length] || {};
  }

  getPrevFeatured(): any {
    const list = this.getFeaturedList();
    if (!list.length) return {};
    return list[(this.featuredIndex - 1 + list.length) % list.length];
  }

  getNextFeatured(): any {
    const list = this.getFeaturedList();
    if (!list.length) return {};
    return list[(this.featuredIndex + 1) % list.length];
  }

  selectFeatured(index: number): void {
    const list = this.getFeaturedList();
    if (!list.length) return;
    this.featuredIndex = ((index % list.length) + list.length) % list.length;
  }

  prevFeatured(): void {
    this.selectFeatured(this.featuredIndex - 1);
  }

  nextFeatured(): void {
    this.selectFeatured(this.featuredIndex + 1);
  }

  addFeaturedToCart(product: any): void {
    if (!product || this.isProductOutOfStock(product)) {
      this.showToast('No hay stock suficiente de este platillo por el momento.');
      return;
    }
    this.selectedProduct = product;
    this.customQty = 1;
    this.customNotes = '';
    this.modifiableIngredients = (product.ingredients || []).map((name: string) => ({ name, selected: true }));
    this.extraToppings.forEach(t => (t.selected = false));
    this.confirmCustomizedAddToCart();
  }

  getAvailableStock(product: any): number {
    if (!product) return 0;
    const stock = product.stockDisponible ?? product.stock;
    return Math.max(0, Number.isFinite(Number(stock)) ? Math.floor(Number(stock)) : 0);
  }

  isProductOutOfStock(product: any): boolean {
    return !product || product.disponible === 0 || product.disponible === false || this.getAvailableStock(product) <= 0;
  }

  getCartQuantityForProduct(product: any): number {
    if (!product) return 0;
    return (this.cart || []).filter(item =>
      Number(item.productId) === Number(product.id) ||
      (!item.productId && String(item.name).toLowerCase() === String(product.name).toLowerCase())
    ).reduce((total, item) => total + (Number(item.qty) || 0), 0);
  }

  getRemainingStock(product: any): number {
    return Math.max(0, this.getAvailableStock(product) - this.getCartQuantityForProduct(product));
  }

  canIncreaseCartItem(item: any): boolean {
    const product = (this.products || []).find(p => Number(p.id) === Number(item.productId)) ||
      (this.products || []).find(p => String(p.name).toLowerCase() === String(item.name).toLowerCase());
    return Boolean(product && this.getCartQuantityForProduct(product) < this.getAvailableStock(product));
  }

  incrementCustomQty(): void {
    if (!this.selectedProduct || this.customQty >= this.getRemainingStock(this.selectedProduct)) {
      this.showToast('No hay stock suficiente, reduce la cantidad.');
      return;
    }
    this.customQty += 1;
  }

  private isAuthenticatedClient(): boolean {
    return Boolean(this.loggedEmail && !this.isGuest);
  }

  private restorePendingCartIfLoggedIn() {
    if (!this.isAuthenticatedClient()) return;
    try {
      const pending = sessionStorage.getItem('hanami_pending_cart');
      if (pending) {
        const parsed = JSON.parse(pending);
        if (Array.isArray(parsed) && parsed.length > 0 && this.cart.length === 0) {
          this.cart = parsed;
          this.showBagDrawer = true;
          this.showCheckoutModal = false;
        }
        sessionStorage.removeItem('hanami_pending_cart');
      }
    } catch {}
  }

  private requireAuth(actionMessage: string): boolean {
    if (!this.isAuthenticatedClient()) {
      try {
        sessionStorage.setItem('hanami_pending_cart', JSON.stringify(this.cart));
      } catch {}
      this.showToast(actionMessage);
      setTimeout(() => this.onRequireLogin.emit(actionMessage), 350);
      return false;
    }
    return true;
  }

  toggleBagDrawer() {
    this.showBagDrawer = !this.showBagDrawer;
    if (this.showBagDrawer) {
      this.showCheckoutModal = false;
      this.loadClientCouponsFromDatabase();
    }
  }

  openCheckoutStep() {
    if (!this.cart || this.cart.length === 0) {
      this.showToast('Tu orden está vacía.');
      return;
    }
    if (!this.requireAuth('Inicia sesión o regístrate para finalizar tu pedido.')) {
      return;
    }
    this.showBagDrawer = false;
    this.showCheckoutModal = true;
  }

  closeCheckoutModal() {
    this.showCheckoutModal = false;
  }

  private applyUserRecord(found: any) {
    const fullName = found.nombre || found.name || '';
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);

    this.userProfile.name = found.firstName || nameParts[0] || '';
    this.userProfile.lastName = found.apellido || found.lastName || nameParts.slice(1).join(' ') || '';
    this.userProfile.email = found.correo || found.email || this.loggedEmail;
    this.userProfile.phone = found.telefono || found.phone || '';
    this.userProfile.address = found.direccion || found.address || '';
    this.selectedAddress = this.userProfile.address;
  }

  loadUserProfile() {
    if (this.loggedEmail) {
      this.userProfile.email = this.loggedEmail;
    }

    if (this.loggedEmail && Array.isArray(this.users) && this.users.length > 0) {
      const found = this.users.find(
        (u: any) => (u.correo || u.email || '').toLowerCase().trim() === this.loggedEmail.toLowerCase().trim()
      );
      if (found) {
        this.applyUserRecord(found);
        return;
      }
    }

    if (this.loggedEmail) {
      fetch('http://localhost:5000/api/data')
        .then(res => res.json())
        .then(data => {
          const allUsers = [
            ...(Array.isArray(data.clients) ? data.clients : []),
            ...(Array.isArray(data.users) ? data.users : [])
          ];
          const found = allUsers.find(
            (u: any) => (u.correo || u.email || '').toLowerCase().trim() === this.loggedEmail.toLowerCase().trim()
          );
          if (found) {
            this.applyUserRecord(found);
          }
        })
        .catch(() => {});
    }
  }

  loadSecondaryAddressesFromDatabase() {
    if (!this.isAuthenticatedClient()) return;
    fetch(`http://localhost:5000/api/user/addresses?email=${encodeURIComponent(this.loggedEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.addresses)) {
          this.userAddresses = data.addresses;
        } else {
          const saved = localStorage.getItem('hanami_sec_addresses_' + this.loggedEmail);
          if (saved) this.userAddresses = JSON.parse(saved);
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('hanami_sec_addresses_' + this.loggedEmail);
        if (saved) this.userAddresses = JSON.parse(saved);
      });
  }

  syncAddressesToDatabase() {
    if (!this.isAuthenticatedClient()) return;
    fetch('http://localhost:5000/api/user/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.loggedEmail, addresses: this.userAddresses })
    })
      .then(res => res.json())
      .catch(() => {});

    localStorage.setItem('hanami_sec_addresses_' + this.loggedEmail, JSON.stringify(this.userAddresses));
  }

  private extractIngredientsFromProduct(p: any): string[] {
    const prodIdKey = p?.id !== undefined && p?.id !== null ? String(p.id) : '';
    if (prodIdKey && Array.isArray(this.ingredientsByProductId[prodIdKey]) && this.ingredientsByProductId[prodIdKey].length > 0) {
      return [...this.ingredientsByProductId[prodIdKey]];
    }

    const raw =
      p?.ingredients ??
      p?.ingredientes ??
      p?.recipeIngredients ??
      p?.receta ??
      p?.insumos ??
      [];

    if (Array.isArray(raw)) {
      const cleaned = raw
        .map((item: any) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object') {
            return String(item.nombre || item.name || item.ingrediente || '').trim();
          }
          return '';
        })
        .filter(Boolean);
      if (cleaned.length > 0) return Array.from(new Set(cleaned));
    }

    if (typeof raw === 'string' && raw.trim()) {
      const splitList = raw
        .split(/[,;|]+/)
        .map(s => s.trim())
        .filter(Boolean);
      if (splitList.length > 0) return Array.from(new Set(splitList));
    }

    const nombre = (p?.name || p?.nombre || '').toLowerCase();
    if (nombre.includes('chirashi')) return ['Arroz sazonado', 'Salmón importación', 'Aguacate Hass'];
    return ['Arroz japonés grano corto (Nishiki)', 'Salmón fresco', 'Aguacate'];
  }

  loadProductsFromDatabase() {
    fetch('http://localhost:5000/api/menu/ingredientes')
      .then(res => res.json())
      .then(ingData => {
        if (ingData && ingData.success && ingData.ingredientsByProduct) {
          this.ingredientsByProductId = ingData.ingredientsByProduct;
        }
      })
      .catch(() => {})
      .finally(() => {
        fetch('http://localhost:5000/api/data')
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data.products)) {
              this.products = data.products.map((p: any) => ({
                ...p,
                ingredients: this.extractIngredientsFromProduct(p)
              }));
              if (this.featuredIndex >= this.products.length) {
                this.featuredIndex = 0;
              }
            } else if (Array.isArray(this.products) && this.products.length > 0) {
              this.products = this.products.map((p: any) => ({
                ...p,
                ingredients: this.extractIngredientsFromProduct(p)
              }));
            }
          })
          .catch(() => {
            if (Array.isArray(this.products) && this.products.length > 0) {
              this.products = this.products.map((p: any) => ({
                ...p,
                ingredients: this.extractIngredientsFromProduct(p)
              }));
            }
          });
      });
  }

  loadOrdersFromDatabase() {
    if (!this.isAuthenticatedClient()) {
      this.orders = [];
      this.backendCompletedOrders = null;
      this.backendTierName = '';
      this.refreshRewardsUnlockStatus();
      return;
    }
    fetch(`http://localhost:5000/api/orders?email=${encodeURIComponent(this.loggedEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.orders)) {
          this.trackOrderStatusChanges(data.orders);
          this.orders = data.orders;
          this.loadClientCouponsFromDatabase();
        }
      })
      .catch(err => console.error('Error cargando pedidos:', err));
  }

  private startOrderStatusPolling() {
    if (this.orderPollingTimer) {
      clearInterval(this.orderPollingTimer);
      this.orderPollingTimer = null;
    }
    if (!this.isAuthenticatedClient()) return;
    this.orderPollingTimer = setInterval(() => this.loadOrdersFromDatabase(), 8000);
  }

  private trackOrderStatusChanges(orders: any[]) {
    for (const order of orders) {
      const folio = String(order.folio || order.id || '');
      const status = String(order.status || 'Pendiente');
      if (!folio) continue;
      const previous = this.knownOrderStatuses.get(folio);
      if (this.orderStatusSnapshotReady && previous && previous !== status) {
        this.orderStatusNotifications.unshift({
          id: `${folio}:${status}:${Date.now()}`,
          folio,
          status,
          message: `Tu pedido #${folio} cambió a: ${status}.`,
          createdAt: order.createdAt || new Date().toISOString()
        });
        this.orderStatusNotifications = this.orderStatusNotifications.slice(0, 12);
      }
      this.knownOrderStatuses.set(folio, status);
    }
    this.orderStatusSnapshotReady = true;
  }

  getActiveOrderCount(): number {
    return (this.orders || []).filter(order => !String(order.status || '').toLowerCase().includes('entregado'))
      .filter(order => !String(order.status || '').toLowerCase().includes('cancelado')).length;
  }

  openOrderNotifications() {
    this.showOrderNotifications = !this.showOrderNotifications;
    if (this.showOrderNotifications && this.isAuthenticatedClient()) this.loadOrdersFromDatabase();
  }

  viewOrderFromNotification() {
    this.showOrderNotifications = false;
    this.setClientSection('pedidos');
  }

  loadReservasFromDatabase() {
    if (!this.isAuthenticatedClient()) {
      this.misReservas = [];
      return;
    }
    fetch(`http://localhost:5000/api/reservas?email=${encodeURIComponent(this.loggedEmail)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.reservas)) {
          this.misReservas = data.reservas;
        }
      })
      .catch(err => console.error('Error cargando reservas:', err));
  }

  setClientSection(section: string) {
    if (
      (section === 'pedidos' || section === 'reservas' || section === 'rewards' || section === 'perfil') &&
      !this.isAuthenticatedClient()
    ) {
      this.requireAuth('Inicia sesión o regístrate para acceder a esta sección.');
      return;
    }

    this.clientSection = section;
    this.showBagDrawer = false;
    this.showCheckoutModal = false;
    if (section === 'menu') this.loadProductsFromDatabase();
    if (section === 'pedidos') this.loadOrdersFromDatabase();
    if (section === 'reservas') this.loadReservasFromDatabase();
    if (section === 'rewards') {
      this.loadOrdersFromDatabase();
      this.loadClientCouponsFromDatabase();
    }
    if (section === 'perfil') this.loadUserProfile();
  }

  getOrdersByStatus(statusType: string) {
    if (!this.orders) return [];
    if (statusType === 'proceso') {
      return this.orders.filter(o => !(o.status || '').toLowerCase().includes('entregado'));
    } else {
      return this.orders.filter(o => (o.status || '').toLowerCase().includes('entregado'));
    }
  }

  repeatOrderToCart(order: any) {
    const itemsText = order?.itemsText || '';
    if (!itemsText) {
      this.showToast('No se encontraron productos para repetir.');
      return;
    }

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

    let addedCount = 0;

    for (const part of parts) {
      const match = part.match(/^(\d+)x\s+([^(]+)(?:\((.+)\))?$/i);
      let qty = match ? Math.max(1, parseInt(match[1], 10)) : 1;
      const rawName = (match ? match[2] : part).trim();
      const rawDetails = match && match[3] ? match[3].trim() : '';

      let onlyExtras = '';
      if (rawDetails) {
        const extraMatch = rawDetails.match(/Extras:\s*\[([^\]]+)\]/i);
        if (extraMatch && extraMatch[1].trim()) {
          onlyExtras = `Extras: [${extraMatch[1].trim()}]`;
        }
      }

      const foundProduct = (this.products || []).find(
        p => (p.name || '').toLowerCase().trim() === rawName.toLowerCase().trim()
      );
      if (!foundProduct || this.isProductOutOfStock(foundProduct)) continue;
      const availableQty = this.getRemainingStock(foundProduct);
      if (qty > availableQty) {
        qty = availableQty;
        this.showToast(`Stock insuficiente de ${rawName}; ajustamos la cantidad disponible.`);
      }
      if (qty < 1) continue;
      const basePrice = foundProduct ? Number(foundProduct.price) || 0 : 0;

      let extrasPrice = 0;
      if (onlyExtras) {
        for (const top of this.extraToppings) {
          if (onlyExtras.toLowerCase().includes(top.name.toLowerCase())) {
            extrasPrice += Number(top.price) || 0;
          }
        }
      }

      const baseMatch = rawDetails.match(/Base:\s*\[([^\]]*)\]/i);
      const ingredients = baseMatch
        ? baseMatch[1].split(',').map((name: string) => name.trim()).filter(Boolean)
        : (foundProduct.ingredients || []);
      this.cart.push({
        productId: foundProduct.id,
        name: rawName,
        unitPrice: basePrice + extrasPrice,
        qty,
        ingredients,
        customDetails: onlyExtras
      });
      addedCount++;
    }

    if (addedCount > 0) {
      this.showBagDrawer = true;
      this.showCheckoutModal = false;
      this.showToast(`Productos del pedido #${order.folio} agregados a tu orden.`);
    }
  }

  getCompletedOrdersCount(): number {
    if (this.backendCompletedOrders !== null) {
      return this.backendCompletedOrders;
    }
    if (!this.orders) return 0;
    return this.orders.filter(o => (o.status || '').toLowerCase().includes('entregado')).length;
  }

  private getRedeemedStorageKey(): string {
    const email = (this.userProfile.email || this.loggedEmail || 'invitado').toLowerCase().trim();
    return `hanami_used_coupons_${email}`;
  }

  private loadRedeemedCoupons() {
    try {
      const raw = localStorage.getItem(this.getRedeemedStorageKey());
      const parsed = raw ? JSON.parse(raw) : [];
      const localCodes = Array.isArray(parsed)
        ? parsed.map((c: string) => String(c).toUpperCase().trim())
        : [];
      this.redeemedCouponCodes = Array.from(new Set([...this.redeemedCouponCodes, ...localCodes]));
    } catch {}
  }

  private saveRedeemedCoupons() {
    try {
      localStorage.setItem(this.getRedeemedStorageKey(), JSON.stringify(this.redeemedCouponCodes));
    } catch {}
  }

  private markCouponAsUsed(code: string) {
    const cleanCode = (code || '').toUpperCase().trim();
    if (!cleanCode) return;
    if (!this.redeemedCouponCodes.includes(cleanCode)) {
      this.redeemedCouponCodes.push(cleanCode);
      this.saveRedeemedCoupons();
    }
    this.dbCoupons = this.dbCoupons.filter(c => (c.code || '').toUpperCase().trim() !== cleanCode);
    if (this.appliedCoupon && (this.appliedCoupon.code || '').toUpperCase().trim() === cleanCode) {
      this.appliedCoupon = null;
    }
    this.couponInputCode = '';
    this.refreshRewardsUnlockStatus();
  }

  loadClientCouponsFromDatabase() {
    const email = (this.userProfile.email || this.loggedEmail || '').trim();
    const url = email
      ? `http://localhost:5000/api/cupones/cliente?email=${encodeURIComponent(email)}`
      : 'http://localhost:5000/api/cupones/cliente';

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          if (typeof data.completedOrders === 'number') {
            this.backendCompletedOrders = data.completedOrders;
          }
          if (typeof data.tier === 'string') {
            this.backendTierName = data.tier;
          }
          if (Array.isArray(data.redeemedCodes)) {
            this.redeemedCouponCodes = data.redeemedCodes.map((c: string) => String(c).toUpperCase().trim());
            this.saveRedeemedCoupons();
          }
          this.dbCoupons = Array.isArray(data.coupons)
            ? data.coupons.map((c: any) => ({
                id: c.id,
                code: String(c.code || '').toUpperCase().trim(),
                description: c.description || '',
                discountPercent: Number(c.discountPercent) || 0,
                minOrders: Number(c.minOrders) || 0,
                tierRequired: `Mín. ${Number(c.minOrders) || 0} pedidos`,
                title: c.description || `Cupón ${String(c.code || '').toUpperCase().trim()}`,
                unlocked: Boolean(c.unlocked)
              }))
            : [];
        }
        this.refreshRewardsUnlockStatus();
      })
      .catch(() => {
        this.refreshRewardsUnlockStatus();
      });
  }

  refreshRewardsUnlockStatus() {
    this.loadRedeemedCoupons();
    const count = this.getCompletedOrdersCount();

    this.availableRewards = this.dbCoupons
      .filter(r => !this.redeemedCouponCodes.includes((r.code || '').toUpperCase().trim()))
      .map(r => {
        const minReq = Number(r.minOrders) || 0;
        const unlocked = typeof r.unlocked === 'boolean' ? r.unlocked : count >= minReq;
        return {
          ...r,
          tierRequired: r.tierRequired || (minReq > 0 ? `Mín. ${minReq} pedidos` : 'Disponible'),
          title: r.title || r.description || `Cupón ${r.code}`,
          unlocked
        };
      });

    if (this.appliedCoupon) {
      const code = (this.appliedCoupon.code || '').toUpperCase().trim();
      const updated = this.availableRewards.find(r => (r.code || '').toUpperCase().trim() === code);
      if (!updated || !updated.unlocked || this.redeemedCouponCodes.includes(code)) {
        this.appliedCoupon = null;
      } else {
        this.appliedCoupon = updated;
      }
    }
  }

  canjearBoleto(reward: any) {
    if (!this.requireAuth('Inicia sesión o regístrate para canjear tus boletos.')) return;
    const code = (reward?.code || '').toUpperCase().trim();
    if (!reward || !reward.unlocked) {
      this.showToast('Aún no desbloqueas este boleto.');
      return;
    }
    if (this.redeemedCouponCodes.includes(code)) {
      this.showToast('Este cupón ya fue canjeado anteriormente.');
      this.refreshRewardsUnlockStatus();
      return;
    }
    this.appliedCoupon = reward;
    this.couponInputCode = reward.code;
    this.showBagDrawer = true;
    this.showCheckoutModal = false;
    this.showToast(`Boleto ${reward.code} aplicado. Se consumirá al confirmar tu pedido.`);
  }

  aplicarCodigoCupon() {
    if (!this.requireAuth('Inicia sesión o regístrate para usar cupones.')) return;
    const code = (this.couponInputCode || '').trim().toUpperCase();
    if (!code) {
      this.showToast('Escribe o selecciona un código de boleto.');
      return;
    }
    if (this.redeemedCouponCodes.includes(code)) {
      this.showToast('Ese cupón ya fue canjeado y ya no está disponible.');
      return;
    }
    const found = this.availableRewards.find(r => r.code.toUpperCase() === code);
    if (!found) {
      this.showToast('Código de boleto no válido o ya utilizado.');
      return;
    }
    if (!found.unlocked) {
      this.showToast(`Este boleto requiere ${found.tierRequired}.`);
      return;
    }
    this.appliedCoupon = found;
    this.showToast(`Cupón ${found.code} aplicado`);
  }

  quitarCupon() {
    this.appliedCoupon = null;
    this.couponInputCode = '';
    this.showToast('Boleto retirado.');
  }

  getCartSubtotal(): number {
    return this.cart.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0);
  }

  getDiscountAmount(): number {
    if (!this.appliedCoupon || !this.appliedCoupon.unlocked) return 0;
    const pct = Number(this.appliedCoupon.discountPercent) || 0;
    if (pct <= 0) return 0;
    const subtotal = this.getCartSubtotal();
    return Math.round((subtotal * pct) / 100);
  }

  getDeliveryFee(): number {
    if (this.deliveryMode !== 'uber') return 0;
    const totalAfterDiscount = this.getCartSubtotal() - this.getDiscountAmount();
    const hasLoyaltyFreeShipping = this.getCompletedOrdersCount() >= 16;
    return totalAfterDiscount >= 300 || hasLoyaltyFreeShipping ? 0 : 50;
  }

  getCartTotal(): number {
    const total = this.getCartSubtotal() - this.getDiscountAmount() + this.getDeliveryFee();
    return total > 0 ? total : 0;
  }

  getCurrentTierName(): string {
    if (this.backendTierName) {
      return this.backendTierName;
    }
    const count = this.getCompletedOrdersCount();
    if (count >= 51) return 'Nivel 5: Diamond Elite';
    if (count >= 31) return 'Nivel 4: Platinum';
    if (count >= 16) return 'Nivel 3: Oro';
    if (count >= 6) return 'Nivel 2: Plata';
    return 'Nivel 1: Bronce';
  }

  getTierProgressPercentage(): number {
    const count = this.getCompletedOrdersCount();
    if (count >= 51) return 100;
    if (count >= 31) return Math.min(100, Math.round(((count - 30) / 20) * 100));
    if (count >= 16) return Math.min(100, Math.round(((count - 15) / 15) * 100));
    if (count >= 6) return Math.min(100, Math.round(((count - 5) / 10) * 100));
    return Math.min(100, Math.round((count / 5) * 100));
  }

  onPaymentMethodChange() {
    this.cardStatusMessage = '';
    this.cardStatusType = '';
  }

  onReceiptFileSelected(event: any) {
    const file = event?.target?.files?.[0];
    if (!file) return;
    this.transferReceiptFileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      this.transferReceiptPreview = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
    this.showToast(`Comprobante "${file.name}" adjuntado`);
  }

  async procesarPagoTarjeta(): Promise<boolean> {
    const digitsOnly = (this.cardNumber || '').replace(/\D/g, '');
    const cvvDigits = (this.cardCvv || '').replace(/\D/g, '');
    const expiryClean = (this.cardExpiry || '').trim();

    this.isProcessingCard = true;
    this.cardStatusMessage = 'Procesando pago con tarjeta...';
    this.cardStatusType = '';

    try {
      // Esta pantalla no está conectada a una pasarela bancaria. Valida los
      // datos de demostración localmente y nunca deja el checkout esperando un timer.
      if (digitsOnly.length < 13 || digitsOnly.length > 16 || cvvDigits.length !== 3 || !expiryClean) {
        this.cardStatusType = 'error';
        this.cardStatusMessage = 'Revisa los datos de la tarjeta e inténtalo de nuevo.';
        this.showToast(this.cardStatusMessage);
        return false;
      }

      this.cardStatusType = 'success';
      this.cardStatusMessage = 'Datos de tarjeta validados.';
      return true;
    } finally {
      this.isProcessingCard = false;
    }
  }

  addNewAddress() {
    if (!this.requireAuth('Inicia sesión o regístrate para guardar direcciones.')) return;
    if (!this.newAddressLabel || !this.newAddressFull) return;
    this.userAddresses.push({ label: this.newAddressLabel, full: this.newAddressFull });
    this.syncAddressesToDatabase();

    this.newAddressLabel = '';
    this.newAddressFull = '';
    this.showToast('Dirección secundaria agregada y guardada en BD');
  }

  removeAddress(addr: any) {
    if (!this.requireAuth('Inicia sesión o regístrate para modificar direcciones.')) return;
    this.userAddresses = this.userAddresses.filter(a => a !== addr);
    this.syncAddressesToDatabase();
    this.showToast('Dirección eliminada de la base de datos');
  }

  crearReservaMesa() {
    if (!this.requireAuth('Inicia sesión o regístrate para reservar una mesa.')) return;
    if (!this.newReservation.fecha || !this.newReservation.horario) {
      this.showToast('Selecciona fecha y horario para tu reserva.');
      return;
    }

    const ocupada = this.misReservas.some(
      r => String(r.mesa) === String(this.newReservation.mesa) &&
           r.fecha === this.newReservation.fecha &&
           r.horario === this.newReservation.horario
    );
    if (ocupada) {
      this.showToast('La mesa seleccionada ya está ocupada en ese horario.');
      return;
    }

    const payload = {
      email: this.userProfile.email || this.loggedEmail,
      fecha: this.newReservation.fecha,
      horario: this.newReservation.horario,
      personas: this.newReservation.personas,
      mesa: this.newReservation.mesa,
      estado: 'Confirmada / Reservada'
    };

    fetch('http://localhost:5000/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo guardar la reserva');
        }
        return data;
      })
      .then(() => {
        this.showToast('Mesa reservada con éxito');
        this.newReservation = { fecha: '', horario: '', personas: 2, mesa: '1' };
        this.loadReservasFromDatabase();
      })
      .catch(err => {
        console.error('Error al reservar mesa:', err);
        this.showToast('Error al crear reserva: ' + err.message);
      });
  }

  cancelarReserva(id: number) {
    if (!this.requireAuth('Inicia sesión o regístrate para gestionar tus reservas.')) return;
    fetch(`http://localhost:5000/api/reservas?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(() => {
        this.misReservas = this.misReservas.filter(r => r.id !== id);
        this.showToast('Reserva cancelada.');
      })
      .catch(() => {
        this.misReservas = this.misReservas.filter(r => r.id !== id);
        this.showToast('Reserva cancelada.');
      });
  }

  openCustomizeModal(product: any) {
    if (this.isProductOutOfStock(product) || this.getRemainingStock(product) < 1) {
      this.showToast('No hay stock suficiente de este platillo por el momento.');
      return;
    }
    this.selectedProduct = product;
    this.customQty = 1;
    this.customNotes = '';
    const ingList = this.extractIngredientsFromProduct(product);
    this.modifiableIngredients = ingList.map((ing: string) => ({ name: ing, selected: true }));
    this.extraToppings.forEach(t => (t.selected = false));
    this.showCustomizeModal = true;
  }

  getCustomizedItemTotal(): number {
    if (!this.selectedProduct) return 0;
    const base = this.selectedProduct.price;
    const extrasTotal = this.extraToppings.filter(t => t.selected).reduce((sum, t) => sum + t.price, 0);
    return (base + extrasTotal) * this.customQty;
  }

  confirmCustomizedAddToCart() {
    if (!this.selectedProduct) return;
    const remaining = this.getRemainingStock(this.selectedProduct);
    if (this.customQty < 1 || this.customQty > remaining) {
      this.showToast('No hay stock suficiente, reduce la cantidad.');
      return;
    }
    const activeIngs = this.modifiableIngredients.filter(i => i.selected).map(i => i.name).join(', ');
    const activeExtras = this.extraToppings.filter(t => t.selected).map(t => t.name).join(', ');

    let details = `Base: [${activeIngs}]`;
    if (activeExtras) details += ` | Extras: [${activeExtras}]`;
    if (this.customNotes) details += ` | Nota: ${this.customNotes}`;

    this.cart.push({
      productId: this.selectedProduct.id,
      name: this.selectedProduct.name,
      unitPrice: this.getCustomizedItemTotal() / this.customQty,
      qty: this.customQty,
      ingredients: this.modifiableIngredients.filter(i => i.selected).map((i: any) => i.name),
      customDetails: details
    });
    this.showCustomizeModal = false;
    this.showToast('Platillo agregado al pedido');
  }

  updateCartQty(item: any, delta: number) {
    if (delta > 0 && !this.canIncreaseCartItem(item)) {
      this.showToast('No hay stock suficiente, reduce la cantidad.');
      return;
    }
    item.qty += delta;
    if (item.qty <= 0) this.cart = this.cart.filter(i => i !== item);
    if (this.cart.length === 0) this.showCheckoutModal = false;
  }

  async checkoutOrder() {
    if (!this.requireAuth('Inicia sesión o regístrate para hacer tu pedido.')) {
      return;
    }

    if (!this.cart || this.cart.length === 0) {
      this.showToast('Tu orden está vacía.');
      return;
    }

    if (this.deliveryMode === 'programa' && !this.scheduledDate) {
      this.showToast('Selecciona fecha y hora para tu pedido programado.');
      return;
    }

    if (this.paymentMethod === 'Tarjeta') {
      const okCard = await this.procesarPagoTarjeta();
      if (!okCard) {
        return;
      }
    }

    let tipoPedido = 'Al Momento';
    let finalNotes = `Pago: ${this.paymentMethod}`;

    if (this.paymentMethod === 'Transferencia') {
      finalNotes += this.transferReceiptFileName
        ? ` | Comprobante: ${this.transferReceiptFileName} (Mostrar en ventanilla)`
        : ` | Pendiente enviar comprobante y mostrar en ventanilla`;
    } else if (this.paymentMethod === 'Tarjeta') {
      const last4 = (this.cardNumber || '').replace(/\D/g, '').slice(-4);
      finalNotes += ` | Tarjeta terminación ${last4 || '****'} (Validación local; sin pasarela bancaria)`;
    }

    const usedCouponCode = this.appliedCoupon && this.appliedCoupon.unlocked ? this.appliedCoupon.code : '';
    const discountPct = Number(this.appliedCoupon?.discountPercent) || 0;
    const discountAmt = this.getDiscountAmount();
    if (usedCouponCode) {
      finalNotes += discountPct > 0
        ? ` | Boleto ${usedCouponCode} (-${discountPct}% = -$${discountAmt}.00)`
        : ` | Boleto ${usedCouponCode} (${this.appliedCoupon.description || 'Aplicado'})`;
    }

    if (this.deliveryMode === 'programa') {
      tipoPedido = 'Programado';
      finalNotes += ` | Fecha/Hora: ${this.scheduledDate}`;
    } else if (this.deliveryMode === 'uber') {
      tipoPedido = 'Uber Eats';
      finalNotes += ` | Dirección: ${this.selectedAddress || this.userProfile.address}`;
    }

    if (this.clientAllergies.trim()) finalNotes += ` | ALERGIAS: ${this.clientAllergies.trim()}`;
    if (this.clientIsUrgent) finalNotes += ` | URGENTE`;

    const totalPedido = this.getCartTotal();
    const resumenArticulos = this.cart
      .map(i => `${i.qty}x ${i.name}${i.customDetails ? ' (' + i.customDetails + ')' : ''}`)
      .join(', ');

    const newOrder = {
      folio: 'HM-' + Math.floor(1000 + Math.random() * 9000),
      client: `${this.userProfile.name} ${this.userProfile.lastName}`.trim(),
      email: this.userProfile.email || this.loggedEmail,
      type: tipoPedido,
      itemsText: resumenArticulos,
      total: totalPedido,
      status: 'En preparación',
      notes: finalNotes,
      usedCouponCode: usedCouponCode || null,
      items: this.cart.map(item => ({
        productId: item.productId || (this.products || []).find(p => String(p.name).toLowerCase() === String(item.name).toLowerCase())?.id,
        quantity: Number(item.qty) || 1,
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : null
      }))
    };

    this.isSubmittingOrder = true;
    const orderController = new AbortController();
    const orderTimeout = setTimeout(() => orderController.abort(), 15000);
    fetch('http://localhost:5000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
      signal: orderController.signal
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo registrar el pedido.');
        }
        return data;
      })
      .then(() => {
        if (usedCouponCode) {
          this.markCouponAsUsed(usedCouponCode);
        }
        this.showToast('Pedido guardado con éxito');
        this.cart = [];
        this.showBagDrawer = false;
        this.showCheckoutModal = false;
        this.appliedCoupon = null;
        this.couponInputCode = '';
        this.transferReceiptFileName = '';
        this.transferReceiptPreview = '';
        this.cardHolderName = '';
        this.cardNumber = '';
        this.cardExpiry = '';
        this.cardCvv = '';
        this.cardStatusMessage = '';
        this.cardStatusType = '';
        this.clientAllergies = '';
        this.clientIsUrgent = false;
        this.scheduledDate = '';
        this.clientSection = 'pedidos';
        this.orderTab = 'proceso';
        this.loadOrdersFromDatabase();
        this.onDataChange.emit();
      })
      .catch(err => {
        console.error('Error al confirmar compra:', err);
        this.showToast(err.name === 'AbortError' ? 'El servidor tardó demasiado. Intenta confirmar el pedido otra vez.' : (err.message || 'No se pudo confirmar el pedido.'));
      })
      .finally(() => {
        clearTimeout(orderTimeout);
        this.isSubmittingOrder = false;
      });
  }

  saveProfileChanges() {
    if (!this.requireAuth('Inicia sesión o regístrate para actualizar tu perfil.')) return;
    fetch('http://localhost:5000/api/user/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.userProfile)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.showToast('Perfil y dirección principal actualizados en BD');
          this.onDataChange.emit();
        }
      })
      .catch(() => {});
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.showToastFlag = true;
    setTimeout(() => { this.showToastFlag = false; }, 3000);
  }
}
