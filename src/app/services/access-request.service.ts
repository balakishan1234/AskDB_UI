import { Injectable } from '@angular/core';

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  department: string;
  team?: string;
  officeLocation?: string;
  employeeId?: string;
  jobRole: string;
  phone?: string;
  timezone?: string;
  preferredLanguage?: string;
  purposes: string[];
  whyAccess: string;
  knownAdmin?: string;
  status: 'Pending' | 'Reviewing' | 'Approved' | 'Rejected' | 'Expired';
  requestedOn: string;
  approvedBy?: string;
  approvedOn?: string;
  rejectedReason?: string;
  ipAddress?: string;
  browser?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccessRequestService {
  private readonly STORAGE_KEY = 'askdb_access_requests';

  private initialRequests: AccessRequest[] = [
    {
      id: 'REQ-2026-8941',
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@acmeenterprise.com',
      company: 'Acme Enterprise',
      department: 'Data Analytics',
      team: 'Business Intelligence',
      officeLocation: 'New York, US',
      employeeId: 'EMP-90421',
      jobRole: 'Lead BI Analyst',
      phone: '+1 (555) 234-5678',
      timezone: 'EST (UTC-5)',
      preferredLanguage: 'English',
      purposes: ['Analytics', 'Reporting', 'Database Administration'],
      whyAccess: 'Need direct SQL access to revenue and supply chain databases for quarterly Q3 enterprise audit reporting.',
      knownAdmin: 'admin@cgi.com',
      status: 'Pending',
      requestedOn: '2026-08-02T18:30:00Z',
      ipAddress: '198.51.100.42',
      browser: 'Chrome 127.0 (Windows 11)'
    },
    {
      id: 'REQ-2026-8940',
      name: 'David Chen',
      email: 'david.chen@technova.io',
      company: 'TechNova Solutions',
      department: 'DevOps & Infrastructure',
      team: 'Cloud SecOps',
      officeLocation: 'San Francisco, US',
      employeeId: 'TN-4412',
      jobRole: 'Senior SecOps Engineer',
      phone: '+1 (555) 876-5432',
      timezone: 'PST (UTC-8)',
      preferredLanguage: 'English',
      purposes: ['Monitoring', 'Testing', 'Support'],
      whyAccess: 'Setting up automated security vulnerability monitoring on staging database clusters.',
      knownAdmin: 'admin@cgi.com',
      status: 'Pending',
      requestedOn: '2026-08-02T16:15:00Z',
      ipAddress: '203.0.113.88',
      browser: 'Firefox 128.0 (macOS)'
    },
    {
      id: 'REQ-2026-8935',
      name: 'Elena Rostova',
      email: 'elena.r@globaltrade.de',
      company: 'Global Trade Logistics',
      department: 'Financial Systems',
      team: 'ERP Core',
      officeLocation: 'Frankfurt, Germany',
      employeeId: 'GT-0891',
      jobRole: 'Principal Database Administrator',
      phone: '+49 69 1234 5678',
      timezone: 'CET (UTC+1)',
      preferredLanguage: 'German / English',
      purposes: ['Database Administration', 'Monitoring'],
      whyAccess: 'Database migration validation and index optimization across production SQL Server instances.',
      knownAdmin: 'admin@cgi.com',
      status: 'Approved',
      requestedOn: '2026-08-01T10:20:00Z',
      approvedBy: 'System Administrator (admin@cgi.com)',
      approvedOn: '2026-08-01T11:05:00Z',
      ipAddress: '198.51.100.105',
      browser: 'Edge 126.0 (Windows 11)'
    },
    {
      id: 'REQ-2026-8920',
      name: 'Marcus Vance',
      email: 'm.vance@external-contractor.net',
      company: 'Third Party Systems',
      department: 'External Vendor',
      jobRole: 'Freelance Developer',
      purposes: ['Development'],
      whyAccess: 'Requesting access for app dev.',
      status: 'Rejected',
      requestedOn: '2026-07-30T14:00:00Z',
      approvedBy: 'System Administrator (admin@cgi.com)',
      approvedOn: '2026-07-30T15:30:00Z',
      rejectedReason: 'Non-corporate email address domain and unverified employee ID. Corporate email required.',
      ipAddress: '192.0.2.45',
      browser: 'Safari 17.4 (iOS)'
    }
  ];

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!localStorage.getItem(this.STORAGE_KEY)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.initialRequests));
    }
  }

  getRequests(): AccessRequest[] {
    this.ensureInitialized();
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : this.initialRequests;
    } catch {
      return this.initialRequests;
    }
  }

  saveRequests(requests: AccessRequest[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
  }

  submitRequest(data: Partial<AccessRequest>): AccessRequest {
    const requests = this.getRequests();
    const newId = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRequest: AccessRequest = {
      id: newId,
      name: data.name || '',
      email: data.email || '',
      company: data.company || '',
      department: data.department || '',
      team: data.team || '',
      officeLocation: data.officeLocation || '',
      employeeId: data.employeeId || '',
      jobRole: data.jobRole || '',
      phone: data.phone || '',
      timezone: data.timezone || 'UTC (UTC+0)',
      preferredLanguage: data.preferredLanguage || 'English',
      purposes: data.purposes || [],
      whyAccess: data.whyAccess || '',
      knownAdmin: data.knownAdmin || '',
      status: 'Pending',
      requestedOn: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Client)',
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser'
    };

    requests.unshift(newRequest);
    this.saveRequests(requests);
    return newRequest;
  }

  updateStatus(
    id: string,
    status: AccessRequest['status'],
    reason?: string,
    approvedBy: string = 'System Administrator (admin@cgi.com)'
  ): AccessRequest | null {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === id);

    if (req) {
      req.status = status;
      req.approvedBy = approvedBy;
      req.approvedOn = new Date().toISOString();
      if (reason) {
        req.rejectedReason = reason;
      }
      this.saveRequests(requests);
      return req;
    }
    return null;
  }

  deleteRequest(id: string): void {
    const requests = this.getRequests().filter(r => r.id !== id);
    this.saveRequests(requests);
  }

  getStats() {
    const requests = this.getRequests();
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      rejected: requests.filter(r => r.status === 'Rejected').length
    };
  }

  getEmailTemplateHtml(templateType: 'request_received' | 'new_admin_notification' | 'approved' | 'rejected' | 'welcome' | 'password_reset', data: Partial<AccessRequest> = {}): string {
    const name = data.name || 'Enterprise User';
    const email = data.email || 'user@company.com';
    const id = data.id || 'REQ-2026-8941';

    const header = `
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center; border-bottom: 3px solid #3b82f6;">
        <h1 style="color: #ffffff; font-family: 'Outfit', sans-serif; margin: 0; font-size: 26px; letter-spacing: -0.5px;">
          Ask<span style="color: #3b82f6;">DB</span> <span style="font-size: 14px; font-weight: normal; background: rgba(59, 130, 246, 0.2); color: #60a5fa; padding: 3px 10px; border-radius: 9999px; vertical-align: middle; margin-left: 8px;">ENTERPRISE</span>
        </h1>
        <p style="color: #94a3b8; font-family: sans-serif; margin: 8px 0 0 0; font-size: 13px;">Secure Database Access & Intelligence Platform</p>
      </div>
    `;

    const footer = `
      <div style="background: #0f172a; padding: 24px; border-radius: 0 0 12px 12px; text-align: center; border-top: 1px solid #1e293b;">
        <p style="color: #64748b; font-family: sans-serif; margin: 0; font-size: 12px;">This is an automated enterprise security notification from AskDB Security Service.</p>
        <p style="color: #475569; font-family: sans-serif; margin: 6px 0 0 0; font-size: 11px;">© 2026 AskDB Inc. All rights reserved. Zero Self-Registration Policy Enforced.</p>
      </div>
    `;

    let body = '';

    switch (templateType) {
      case 'request_received':
        body = `
          <div style="padding: 32px; background: #1e293b; color: #e2e8f0; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #ffffff; margin-top: 0;">Access Request Received</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Thank you for submitting your account request for AskDB Enterprise platform access.</p>
            <div style="background: #0f172a; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8;"><strong>Request ID:</strong> ${id}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;"><strong>Business Email:</strong> ${email}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Manual Verification</span></p>
            </div>
            <p>Your request has been routed to your company's System Administrator for manual identity and security verification. Average approval time is <strong>4 hours</strong>.</p>
            <p style="color: #94a3b8; font-size: 13px;">If you have any urgent questions, please reference your Request ID with your internal IT Helpdesk.</p>
          </div>
        `;
        break;

      case 'new_admin_notification':
        body = `
          <div style="padding: 32px; background: #1e293b; color: #e2e8f0; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Action Required: New Access Request</h2>
            <p>Hello Administrator,</p>
            <p>A new enterprise access request has been submitted requiring your manual security review.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 13px;">
              <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 10px 16px; color: #94a3b8; width: 120px;">Requester:</td><td style="padding: 10px 16px; color: #ffffff; font-weight: bold;">${name}</td></tr>
              <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 10px 16px; color: #94a3b8;">Email:</td><td style="padding: 10px 16px; color: #60a5fa;">${email}</td></tr>
              <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 10px 16px; color: #94a3b8;">Company:</td><td style="padding: 10px 16px; color: #ffffff;">${data.company || 'Enterprise'}</td></tr>
              <tr style="border-bottom: 1px solid #1e293b;"><td style="padding: 10px 16px; color: #94a3b8;">Department:</td><td style="padding: 10px 16px; color: #ffffff;">${data.department || 'N/A'}</td></tr>
              <tr><td style="padding: 10px 16px; color: #94a3b8;">Reason:</td><td style="padding: 10px 16px; color: #cbd5e1;">${data.whyAccess || 'Access required for analytics'}</td></tr>
            </table>
            <div style="text-align: center; margin-top: 24px;">
              <a href="#" style="background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Open Admin Dashboard</a>
            </div>
          </div>
        `;
        break;

      case 'approved':
        body = `
          <div style="padding: 32px; background: #1e293b; color: #e2e8f0; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #10b981; margin-top: 0;">🎉 Access Approved!</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Great news! Your account request for AskDB Enterprise has been verified and approved by your Administrator.</p>
            <div style="background: #0f172a; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8;"><strong>Login Email:</strong> ${email}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;"><strong>Temporary Password:</strong> <code style="background: #1e293b; color: #34d399; padding: 3px 8px; border-radius: 4px; font-weight: bold;">AskDB#2026!Pass</code></p>
            </div>
            <p style="color: #f59e0b; font-size: 13px;"><strong>Security Notice:</strong> You will be forced to change your password immediately upon your first sign-in.</p>
            <div style="text-align: center; margin-top: 24px;">
              <a href="#" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Sign In to AskDB</a>
            </div>
          </div>
        `;
        break;

      case 'rejected':
        body = `
          <div style="padding: 32px; background: #1e293b; color: #e2e8f0; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #ef4444; margin-top: 0;">Access Request Status Update</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your access request (Ref: <strong>${id}</strong>) for AskDB Enterprise could not be approved at this time.</p>
            <div style="background: #0f172a; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 13px; color: #f87171;"><strong>Reason:</strong> ${data.rejectedReason || 'Could not verify employment or security clearance.'}</p>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">If you believe this is an error, please contact your internal IT Security department to re-verify your credentials.</p>
          </div>
        `;
        break;

      case 'welcome':
        body = `
          <div style="padding: 32px; background: #1e293b; color: #e2e8f0; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #38bdf8; margin-top: 0;">Welcome to AskDB Enterprise</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Welcome aboard! You now have full access to natural language database querying, schema visualization, and workspace collaboration.</p>
            <div style="background: #0f172a; padding: 16px; margin: 20px 0; border-radius: 8px; border: 1px solid #334155;">
              <h4 style="margin: 0 0 8px 0; color: #38bdf8;">Next Steps:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px;">
                <li style="margin-bottom: 6px;">Connect your registered database workspace</li>
                <li style="margin-bottom: 6px;">Try asking questions in plain English</li>
                <li style="margin-bottom: 6px;">Explore auto-generated SQL and visual result charts</li>
              </ul>
            </div>
          </div>
        `;
        break;

      case 'password_reset':
        body = `
          <div style="padding: 32px; background: #1e293b; color: #e2e8f0; font-family: sans-serif; line-height: 1.6;">
            <h2 style="color: #a855f7; margin-top: 0;">Password Reset Request</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>We received a request to reset your password for AskDB Enterprise access.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="#" style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password Now</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This link expires in 30 minutes. If you did not request this, please contact SecOps immediately.</p>
          </div>
        `;
        break;
    }

    return `
      <div style="max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); overflow: hidden; border: 1px solid #1e293b;">
        ${header}
        ${body}
        ${footer}
      </div>
    `;
  }
}
