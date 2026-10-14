import {inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {CreateSlotDto, Slot, UpdateSlotDto} from "../models/slot";
import {Observable} from "rxjs";

const SLOTS_ENDPOINT = '/api/slots';

@Injectable({providedIn: 'root'})
export class SlotsService {
  private readonly http = inject(HttpClient);

  create(dto: CreateSlotDto): Observable<Slot> {
    return this.http.post<Slot>(SLOTS_ENDPOINT, dto);
  }

  getMine(): Observable<Slot[]> {
    return this.http.get<Slot[]>(`${SLOTS_ENDPOINT}/mine`);
  }

  update(id: string, dto: UpdateSlotDto): Observable<Slot> {
    return this.http.put<Slot>(`${SLOTS_ENDPOINT}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${SLOTS_ENDPOINT}/${id}`);
  }
}
