/**
 * app.component.spec.ts — unit tests for AppComponent, the application shell.
 *
 * Purpose: guards the parts of the shell the rest of the team depends on — the application name in
 * the top bar, one navigation link per destination (in order), and the router outlet that pages are
 * rendered into. Adding a destination to the menu means updating this test as well.
 *
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the application title', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance.title).toBe('BAAAM Scheduling System');
  });

  it('should render the application title in the top bar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const brand = fixture.nativeElement.querySelector('.app-brand') as HTMLElement | null;

    expect(brand?.textContent).toContain('BAAAM Scheduling System');
  });

  it('should render one navigation link per destination, in order', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.app-nav__link')
    ) as HTMLAnchorElement[];

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Home',
      'Calendar',
      'Appointments',
      'Statistics'
    ]);
  });

  it('should render the router outlet used by the routed pages', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
