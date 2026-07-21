import { Injectable, signal, computed } from '@angular/core';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class MockConsoleService {
  private _isOpen = signal<boolean>(false);

  isOpen = computed(() => API_CONFIG.useMock && this._isOpen());

  toggle(): void {
    if (API_CONFIG.useMock) {
      this._isOpen.set(!this._isOpen());
    }
  }

  open(): void {
    if (API_CONFIG.useMock) {
      this._isOpen.set(true);
    }
  }

  close(): void {
    this._isOpen.set(false);
  }
}

