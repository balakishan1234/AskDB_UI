import { Routes } from '@angular/router';
import { Login } from './login/login';
import { WorkSpace } from './work-space/work-space';
import { AIChat } from './ai-chat/ai-chat';
import { authGuard, loginGuard } from './guards/auth.guard';
import { Home } from './home/home';

export const routes: Routes = [
  {path:'' , component:Home },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'work-space', component: WorkSpace, canActivate: [authGuard] },
  { path: 'ai-chat', component: AIChat, canActivate: [authGuard] },

  // Optional
  { path: '**', redirectTo: '' }
];
