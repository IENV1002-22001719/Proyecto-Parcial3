import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  @Input() registeredUsers: any[] = [];
  @Output() onLoginSuccess = new EventEmitter<{ role: string, email: string }>();
  @Output() onRegisterUser = new EventEmitter<any>();

  isRegisterMode = false;

  // Campos de Login
  loginEmail = '';
  loginPassword = '';

  // Campos de Registro (con todos los datos solicitados en la BD en español)
  regName = '';
  regLastName = '';
  regEmail = '';
  regPassword = '';
  regBirthDate = '';
  regPhone = '';
  regGender = 'Femenino';
  regAddress = '';

  toastMessage = '';
  showToastFlag = false;

  onBirthDateChange() {
    // Validaciones de fecha si se requieren
  }

  private mapRole(rawRole: any, rolId: any, emailLower: string): string {
    if (emailLower === 'administrador@hanami.com' || Number(rolId) === 1) return 'admin';
    if (emailLower === 'cocina@hanami.com' || Number(rolId) === 2) return 'kitchen';

    const r = String(rawRole || '').toLowerCase().trim();
    if (r === 'admin' || r === 'administrador') return 'admin';
    if (r === 'kitchen' || r === 'cocina' || r === 'chef') return 'kitchen';
    return 'client';
  }

  handleLogin() {
    const email = (this.loginEmail || '').trim();
    const password = (this.loginPassword || '').trim();

    if (!email || !password) {
      this.notify('Por favor ingresa tu correo y contraseña', true);
      return;
    }

    const emailLower = email.toLowerCase();

    fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: email, contrasena: password })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success || !data.user) {
          throw new Error(data.error || 'Credenciales incorrectas o usuario no registrado en la BD');
        }
        return data.user;
      })
      .then(user => {
        const role = this.mapRole(user.rol, user.rol_id, emailLower);
        const displayName = [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || email;

        this.onLoginSuccess.emit({ role, email });

        if (role === 'admin') {
          this.notify('¡Bienvenido al Panel Gerencial, Administrador!');
        } else if (role === 'kitchen') {
          this.notify('¡Bienvenido al Panel de Cocina!');
        } else {
          this.notify(`¡Bienvenido de vuelta, ${displayName}!`);
        }
      })
      .catch(err => {
        console.error('Error en login:', err);
        this.notify(err.message || 'Credenciales incorrectas o usuario no registrado en la BD', true);
      });
  }

  handleRegister() {
    if (!this.regName || !this.regLastName || !this.regEmail || !this.regPassword || !this.regPhone || !this.regAddress) {
      this.notify('Por favor completa todos los campos obligatorios (*)', true);
      return;
    }

    const cleanPhone = this.regPhone.trim();
    if (cleanPhone.length !== 10) {
      this.notify('El número telefónico debe tener exactamente 10 dígitos', true);
      return;
    }

    const newUser = {
      name: this.regName.trim(),
      lastName: this.regLastName.trim(),
      email: this.regEmail.trim(),
      password: this.regPassword,
      birthdate: this.regBirthDate || '2000-01-01',
      gender: this.regGender,
      phone: cleanPhone,
      address: this.regAddress.trim(),
      role: 'Cliente'
    };

    fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error al registrar el usuario');
        }
        return data;
      })
      .then(() => {
        this.notify('¡Registro exitoso en la Base de Datos! Ya puedes iniciar sesión.');
        this.onRegisterUser.emit(newUser);
        this.isRegisterMode = false;

        this.loginEmail = newUser.email;
        this.loginPassword = '';

        this.regName = '';
        this.regLastName = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regPhone = '';
        this.regBirthDate = '';
        this.regAddress = '';
      })
      .catch(err => {
        console.error('Error de conexión con Flask:', err);
        this.notify(err.message || 'No se pudo conectar con el servidor backend', true);
      });
  }

  notify(msg: string, isError = false) {
    this.toastMessage = msg;
    this.showToastFlag = true;
    setTimeout(() => { this.showToastFlag = false; }, 4000);
  }
}