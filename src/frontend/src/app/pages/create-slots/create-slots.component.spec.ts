import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CreateSlotsComponent } from './create-slots.component';
import { SlotsService } from '../../core/services/slots.service';

describe('CreateSlotsComponent provider flow', () => {
  let component: CreateSlotsComponent;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: SlotsService, useValue: { providers: () => of([]) } }] });
    component = TestBed.runInInjectionContext(() => new CreateSlotsComponent());
    component.providers = [ { id: 'beauty', name: 'Salon', specialty: 'Beauty' } ];
  });
  it('derives categories from the provider and clears the previous service', () => {
    component.draft.title = 'Physical';
    component.draft.providerId = 'beauty';
    component.providerChanged();
    expect(component.categories).toEqual(['Beauty']);
    expect(component.draft.category).toBe('Beauty');
    expect(component.draft.title).toBe('');
    expect(component.draft.providerId).toBe('beauty');
  });
  it('creates a fixed 60 minute range and ignores past dates', () => {
    component.chooseDate('2099-01-15');
    component.chooseTime('10:30');
    expect(Date.parse(component.draft.end) - Date.parse(component.draft.start)).toBe(60 * 60000);
    const start = component.draft.start;
    component.chooseDate('2000-01-01');
    expect(component.draft.start).toBe(start);
  });
});
