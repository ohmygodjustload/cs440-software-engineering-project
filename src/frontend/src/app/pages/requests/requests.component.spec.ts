import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RequestsComponent } from './requests.component';

describe('RequestsComponent', () => {
  let fixture: ComponentFixture<RequestsComponent>;
  let component: RequestsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads pending requests after init', () => {
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.requests.length).toBe(4);
  });

  it('renders the heading, subtitle, and request rows', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.greeting h1')?.textContent).toContain('Requests');
    expect(el.querySelector('.greeting p')?.textContent).toContain(
      'Review pending provider requests'
    );
    expect(el.textContent).toContain('Pending requests');
    expect(el.textContent).toContain('Brendan Lambrecht');
    expect(el.textContent).toContain('Provider type: Not specified');
    expect(el.textContent).toContain('Andrew Peirce');
    expect(el.textContent).toContain('Provider type: Fitness');
    expect(el.textContent).toContain('Maya Chen');
    expect(el.textContent).toContain('Ava Brooks');
  });

  it('links each Review action to the request detail route', () => {
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.request-card .primary')
    ) as HTMLAnchorElement[];

    expect(links.length).toBe(4);
    expect(links[0].textContent?.trim()).toBe('Review');
    expect(links[0].getAttribute('href')).toContain('/admin/requests/pr-101');
  });

  it('shows an error state and retries on Try again', () => {
    component.loading = false;
    component.error = 'Could not load provider requests.';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not load provider requests.');

    fixture.nativeElement.querySelector('button')?.click();
    fixture.detectChanges();

    expect(component.error).toBeNull();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Brendan Lambrecht');
  });

  it('shows empty copy when there are no pending requests', () => {
    component.requests = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No pending provider requests.'
    );
  });
});