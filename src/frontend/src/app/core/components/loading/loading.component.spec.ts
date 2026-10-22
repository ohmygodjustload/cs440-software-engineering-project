/**
 * loading.component.spec.ts — unit tests for the shared loading indicator.
 *
 * Purpose: locks in the two things pages rely on — the spinner is rendered, and the host
 * carries role="status" with the requested label so loaders announce like the text they replace.
 *
 */

import { TestBed } from '@angular/core/testing';

import { LoadingComponent } from './loading.component';

describe('LoadingComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingComponent]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoadingComponent);
    fixture.componentInstance.label = 'Loading appointments…';
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the spinner and the status label with role="status"', () => {
    const fixture = TestBed.createComponent(LoadingComponent);
    fixture.componentInstance.label = 'Loading appointments…';
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;

    expect(host.getAttribute('role')).toBe('status');
    expect(host.querySelector('.loading__spinner')).not.toBeNull();
    expect(host.textContent).toContain('Loading appointments…');
  });
});
