import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessionTimeoutService } from '../services/session-timeout.service';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {

  const sessionService = inject(SessionTimeoutService);

  // ✅ Add credentials to every request
  const credentialReq = req.clone({
    withCredentials: true
  });

  // ✅ Reset session timer on every API call
  sessionService.resetTimer();

  return next(credentialReq).pipe(
    catchError((error: HttpErrorResponse) => {

      // ✅ Session expired from backend
      if (error.status === 401) {
        sessionService.logout(); // Clears storage + goes to login
      }

      return throwError(() => error);
    })
  );
};