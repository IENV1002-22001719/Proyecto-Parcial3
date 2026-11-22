import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login.component';
import { ClientViewComponent } from './client/client.component';
import { AdminComponent } from './admin/admin.component';
import { CocinaComponent } from './cocina/cocina.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, ClientViewComponent, AdminComponent, CocinaComponent],
  template: `
    <div class="min-h-screen text-slate-800 antialiased selection:bg-pink-200 selection:text-pink-900 relative">
        <div class="fixed inset-0 pointer-events-none z-1 opacity-45 bg-[radial-gradient(circle_at_10%_15%,rgba(255,185,200,0.55)_0%,transparent_35%)]"></div>
        <div class="sakura-branches-pattern"></div>

        <!-- MÓDULO LOGIN (cuando se solicita login/registro desde cliente o al cerrar sesión) -->
        <div *ngIf="showLoginModal && loggedRole === ''" class="relative z-50">
          <button (click)="showLoginModal = false"
                  class="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-white text-[#5C0B1B] font-black text-xs shadow-lg border-2 border-[#E4D4BA] hover:bg-[#FAF5EC] transition">
            ← Volver al Menú
          </button>
          <app-login (onLoginSuccess)="handleLogin($event)"></app-login>
        </div>

        <!-- MÓDULO CLIENTE (visible primero como escaparate/menú y activo al loguearse como 'client') -->
        <app-client *ngIf="loggedRole === 'client' || (loggedRole === '' && !showLoginModal)"
                    [loggedEmail]="loggedEmail"
                    [isGuest]="loggedRole !== 'client'"
                    [products]="products"
                    [rawMaterials]="rawMaterials"
                    [orders]="orders"
                    [users]="users"
                    [notificationLog]="notificationLog"
                    (onRequireLogin)="openLoginForOrder($event)"
                    (onLogout)="handleLogout()"
                    (onDataChange)="fetchBackendData()">
        </app-client>

        <!-- MÓDULO COCINA -->
        <app-cocina *ngIf="loggedRole === 'kitchen' || loggedRole === 'cocina'"
                    [loggedEmail]="loggedEmail"
                    [orders]="orders"
                    [notificationLog]="notificationLog"
                    (onLogout)="handleLogout()"
                    (onDataChange)="fetchBackendData()">
        </app-cocina>

        <!-- MÓDULO ADMINISTRADOR -->
        <app-admin *ngIf="loggedRole === 'admin'"
                   [loggedEmail]="loggedEmail"
                   [rawMaterials]="rawMaterials"
                   [products]="products"
                   [orders]="orders"
                   [notificationLog]="notificationLog"
                   (onLogout)="handleLogout()"
                   (onDataChange)="fetchBackendData()">
        </app-admin>
    </div>
  `
})
export class App implements OnInit {
  loggedRole = '';
  loggedEmail = '';
  showLoginModal = false;

  rawMaterials: any[] = [];
  products: any[] = [];
  orders: any[] = [];
  users: any[] = [];

  notificationLog: Array<{ time: string, text: string, type: string }> = JSON.parse(localStorage.getItem('sakura_notifications') || JSON.stringify([
    { time: '10:15 AM', text: 'Sistema conectado con Saku-DB (MySQL activo).', type: 'info' }
  ]));

  ngOnInit() {
    this.fetchBackendData();
  }

  openLoginForOrder(_reason?: string) {
    this.showLoginModal = true;
  }

  fetchBackendData() {
    fetch('http://localhost:5000/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.rawMaterials) this.rawMaterials = data.rawMaterials;
        if (data.products) this.products = data.products;

        const allUsers = [
          ...(Array.isArray(data.clients) ? data.clients : []),
          ...(Array.isArray(data.users) ? data.users : [])
        ];
        if (allUsers.length > 0) {
          this.users = allUsers;
        }

        if (data.orders) {
          this.orders = data.orders.map((o: any) => ({
            id: o.id,
            folio: o.folio || o.id_pedido,
            type: o.type || o.tipo_pedido || 'Al Momento',
            status: o.status || o.estado || 'En preparación',
            total: Number(o.total || o.monto_total || 0),
            itemsText: o.itemsText || o.resumen_articulos || '',
            notes: o.notes || o.notas || ''
          }));
        }
      })
      .catch(() => {
        fetch('http://localhost:5000/api/orders')
          .then(res => res.json())
          .then(orderData => {
            const rawOrders = Array.isArray(orderData) ? orderData : (orderData.orders || []);
            this.orders = rawOrders.map((o: any) => ({
              id: o.id,
              folio: o.folio || o.id_pedido,
              type: o.type || o.tipo_pedido || 'Al Momento',
              status: o.status || o.estado || 'En preparación',
              total: Number(o.total || o.monto_total || 0),
              itemsText: o.itemsText || o.resumen_articulos || '',
              notes: o.notes || o.notas || ''
            }));
          })
          .catch(err => {
            console.warn('Backend Flask no disponible para órdenes:', err);
          });
      });
  }

  handleLogin(event: { role: string, email: string }) {
    this.loggedRole = event.role;
    this.loggedEmail = event.email;
    this.showLoginModal = false;
    this.fetchBackendData();
  }

  handleLogout() {
    this.loggedRole = '';
    this.loggedEmail = '';
    this.showLoginModal = false;
    localStorage.removeItem('loggedRole');
    localStorage.removeItem('loggedEmail');
    this.fetchBackendData();
  }
}