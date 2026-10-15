import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';

import {AuthService} from '../services/auth.service';

/** Sends the stored JWT as `Authorization: Bearer` on calls to our API so the backend knows who is signed in. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/') || req.headers.has('Authorization')) return next(req);
  const token = inject(AuthService).getToken();
  return next(token ? req.clone({setHeaders: {Authorization: `Bearer ${token}`}}) : req);
};
