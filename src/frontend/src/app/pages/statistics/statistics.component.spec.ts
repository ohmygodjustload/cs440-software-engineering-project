/**
 * statistics.component.spec.ts — unit tests for StatisticsComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Statistics Here!". Rewrite these expectations alongside the real panel.
 *
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatisticsComponent } from './statistics.component';

describe('StatisticsComponent', () => {
  let fixture: ComponentFixture<StatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page placeholder text', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent?.trim()).toBe('Statistics Here!');
  });
});
