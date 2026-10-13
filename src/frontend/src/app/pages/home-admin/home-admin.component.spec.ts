import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeAdminComponent, greetingFor, } from './home-admin.component';

describe('greetingFor', () => {
  it('returns morning before noon', () => {
    expect(greetingFor(new Date(2026, 8, 22, 9, 0))).toBe(
      'Good morning, Admin'
    );
  });

  it('returns afternoon from 12:00 to 16:59', () => {
    expect(greetingFor(new Date(2026, 8, 22, 14, 0))).toBe(
      'Good afternoon, Admin'
    );
  });

  it('returns evening from 17:00', () => {
    expect(greetingFor(new Date(2026, 8, 22, 19, 0))).toBe(
      'Good evening, Admin'
    );
  });
});

describe('AdminHomeComponent', () => {
  let fixture: ComponentFixture<HomeAdminComponent>;
  let component: HomeAdminComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeAdminComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeAdminComponent);
    component = fixture.componentInstance;
    component.now = new Date(2026, 8, 22, 9, 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads overview data after init', () => {
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.pendingApprovals).toBe(3);
    expect(component.reviews.length).toBe(2);
    expect(component.activity.length).toBe(3);
  });

  it('renders greeting, date, and summary stats', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.greeting h1')?.textContent).toContain(
      'Good morning, Admin'
    );
    expect(el.querySelector('.greeting p')?.textContent).toContain(
      'Tuesday, September 22, 2026'
    );
    expect(el.textContent).toContain('Pending approvals');
    expect(el.textContent).toContain('3');
    expect(el.textContent).toContain('Active providers');
    expect(el.textContent).toContain('12');
    expect(el.textContent).toContain('Booked today');
    expect(el.textContent).toContain('24');
  });

  it('renders review rows and the review CTA', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ava Brooks');
    expect(el.textContent).toContain('Requested Categories: Beauty, Fitness');
    expect(el.textContent).toContain('Sally Smith');
    expect(el.textContent).toContain('Review Provider Requests');
  });

  it('shows an error state and retries on Try again', () => {
    component.loading = false;
    component.error = 'Could not load the admin overview.';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not load the admin overview.');

    fixture.nativeElement.querySelector('button')?.click();
    fixture.detectChanges();

    expect(component.error).toBeNull();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Needs your review');
  });

  it('shows empty copy when there is nothing to review or report', () => {
    component.reviews = [];
    component.activity = [];
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No provider requests need review.');
    expect(el.textContent).toContain('No recent activity.');
  });
});