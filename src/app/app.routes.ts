import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './login/login';
import { WorkSpace } from './work-space/work-space';
import { AIChat } from './ai-chat/ai-chat';
import { authGuard, loginGuard } from './guards/auth.guard';

import { FeaturesPage } from './public/pages/features/features';
import { SecurityPage } from './public/pages/security/security';
import { PricingPage } from './public/pages/pricing/pricing';
import { RequestAccessPage } from './public/pages/request-access/request-access';
import { PrivacyPage } from './public/pages/privacy/privacy';
import { TermsPage } from './public/pages/terms/terms';
import { ContactPage } from './public/pages/contact/contact';
import { StatusPage } from './public/pages/status/status';
import { AboutPage } from './public/pages/about/about';
import { NotFoundPage } from './public/pages/not-found/not-found';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'features', component: FeaturesPage },
  { path: 'security', component: SecurityPage },
  { path: 'pricing', component: PricingPage },
  { path: 'request-access', component: RequestAccessPage },
  { path: 'privacy', component: PrivacyPage },
  { path: 'terms', component: TermsPage },
  { path: 'contact', component: ContactPage },
  { path: 'status', component: StatusPage },
  { path: 'about', component: AboutPage },

  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'work-space', component: WorkSpace, canActivate: [authGuard] },
  { path: 'ai-chat', component: AIChat, canActivate: [authGuard] },

  { path: '**', component: NotFoundPage }
];
