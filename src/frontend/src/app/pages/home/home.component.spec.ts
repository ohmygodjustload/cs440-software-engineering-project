/**
 * home.component.spec.ts — unit tests for HomeComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Home Here!". Rewrite these expectations alongside the real dashboard.
 *
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page placeholder text', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent?.trim()).toBe('Home Here!');
  });
});
