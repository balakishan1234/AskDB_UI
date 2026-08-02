import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccessRequestService, AccessRequest } from '../../../services/access-request.service';

@Component({
  selector: 'app-request-access',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './request-access.html'
})
export class RequestAccessPage {
  Math = Math;
  currentStep = 1;

  // Form Model
  formData = {
    // Step 2: Org
    company: '',
    department: '',
    team: '',
    officeLocation: '',
    email: '',
    employeeId: '',

    // Step 3: Personal
    name: '',
    jobRole: '',
    phone: '',
    timezone: 'EST (UTC-5)',
    preferredLanguage: 'English',

    // Step 4: Purpose
    purposes: [] as string[],
    whyAccess: '',

    // Step 5: Admin
    knowsAdmin: 'yes' as 'yes' | 'no',
    knownAdmin: 'admin@cgi.com'
  };

  availablePurposes = [
    'Database Administration',
    'Monitoring',
    'Analytics',
    'Support',
    'Development',
    'Testing',
    'Reporting',
    'Other'
  ];

  knownAdminsList = [
    'admin@cgi.com (System Administrator)',
    'secops@enterprise.com (Security Team)',
    'dba-lead@enterprise.com (Lead DBA)'
  ];

  submittedRequest: AccessRequest | null = null;
  errorMessage: string | null = null;

  constructor(
    private accessRequestService: AccessRequestService,
    private router: Router
  ) {}

  nextStep(): void {
    if (this.validateStep(this.currentStep)) {
      this.errorMessage = null;
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(step: number): void {
    if (step < this.currentStep) {
      this.currentStep = step;
    }
  }

  togglePurpose(purpose: string): void {
    const idx = this.formData.purposes.indexOf(purpose);
    if (idx > -1) {
      this.formData.purposes.splice(idx, 1);
    } else {
      this.formData.purposes.push(purpose);
    }
  }

  isPurposeSelected(purpose: string): boolean {
    return this.formData.purposes.includes(purpose);
  }

  validateStep(step: number): boolean {
    if (step === 2) {
      if (!this.formData.company.trim() || !this.formData.department.trim() || !this.formData.email.trim()) {
        this.errorMessage = 'Please complete Company, Department, and Business Email.';
        return false;
      }
      if (!this.formData.email.includes('@')) {
        this.errorMessage = 'Please provide a valid corporate business email address.';
        return false;
      }
    } else if (step === 3) {
      if (!this.formData.name.trim() || !this.formData.jobRole.trim()) {
        this.errorMessage = 'Please provide your Full Name and Job Role.';
        return false;
      }
    } else if (step === 4) {
      if (this.formData.purposes.length === 0) {
        this.errorMessage = 'Please select at least one purpose for access.';
        return false;
      }
      if (!this.formData.whyAccess.trim() || this.formData.whyAccess.trim().length < 10) {
        this.errorMessage = 'Please provide a brief description (at least 10 characters) of why access is needed.';
        return false;
      }
    }
    return true;
  }

  submitRequest(): void {
    if (!this.validateStep(4)) return;

    this.submittedRequest = this.accessRequestService.submitRequest({
      name: this.formData.name,
      email: this.formData.email,
      company: this.formData.company,
      department: this.formData.department,
      team: this.formData.team,
      officeLocation: this.formData.officeLocation,
      employeeId: this.formData.employeeId,
      jobRole: this.formData.jobRole,
      phone: this.formData.phone,
      timezone: this.formData.timezone,
      preferredLanguage: this.formData.preferredLanguage,
      purposes: this.formData.purposes,
      whyAccess: this.formData.whyAccess,
      knownAdmin: this.formData.knowsAdmin === 'yes' ? this.formData.knownAdmin : 'System Administrator'
    });

    this.currentStep = 7; // Success Timeline Step
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
