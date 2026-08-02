import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ThemeService } from '../../../services/theme.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html'
})
export class NavbarComponent {
  @Output() openCommandPalette = new EventEmitter<void>();
  isMobileMenuOpen = false;

  constructor(
    public themeService: ThemeService,
    public authService: AuthService,
    private router: Router
  ) {}

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  triggerCommandPalette(): void {
    this.openCommandPalette.emit();
    this.closeMobileMenu();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
