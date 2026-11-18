import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment';
import { HomeService } from './home.service';
import { ProviderHomeService } from './home-provider.service';

/** Reuses the existing JWT-scoped endpoints; no demo identity or provider picker. */
@Injectable({ providedIn: 'root' })
export class EnhancedHomeService {
  private readonly clientHome = inject(HomeService);
  private readonly providerHome = inject(ProviderHomeService);

  clientAppointments(): Observable<Appointment[]> {
    return this.clientHome.loadAppointments();
  }

  providerAppointments(): Observable<Appointment[]> {
    return this.providerHome.bookings();
  }
}
