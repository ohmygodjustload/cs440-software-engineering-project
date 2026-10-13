import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsComponent } from './accounts.component';

describe('AccountsComponent', () => {
  let fixture: ComponentFixture<AccountsComponent>;
  let component: AccountsComponent;

  const root = (): HTMLElement => fixture.nativeElement;

  const buttons = (): NodeListOf<HTMLButtonElement> =>
    root().querySelectorAll('button');

  const question = (): string =>
    root()
      .querySelector('h2')!
      .textContent!
      .replace(/\s+/g, ' ')
      .trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the default accept prompt and response labels', () => {
    expect(question()).toBe(
      'Are you sure you want to Accept Ava Brooks?',
    );

    expect(root().querySelector('strong')!.textContent).toBe('Accept');
    expect(buttons()[0].textContent!.trim()).toBe('Yes, accept');
    expect(buttons()[1].textContent!.trim()).toBe('No, go back');

    expect(
      buttons()[0].classList.contains(
        'confirmation-prompt__button--reject',
      ),
    ).toBeFalse();
  });

  it('renders the outlined reject variant', () => {
    fixture.componentRef.setInput('action', 'reject');
    fixture.detectChanges();

    expect(question()).toBe(
      'Are you sure you want to Reject Ava Brooks?',
    );

    expect(root().querySelector('strong')!.textContent).toBe('Reject');
    expect(buttons()[0].textContent!.trim()).toBe('Yes, reject');

    expect(
      buttons()[0].classList.contains(
        'confirmation-prompt__button--reject',
      ),
    ).toBeTrue();
  });

  it('renders a custom person name', () => {
    fixture.componentRef.setInput('personName', 'Sam Rivera');
    fixture.detectChanges();

    expect(question()).toBe(
      'Are you sure you want to Accept Sam Rivera?',
    );
  });
});
