import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationPromptComponent } from './confirmation.component';

describe('ConfirmationPromptComponent', () => {
  let fixture: ComponentFixture<ConfirmationPromptComponent>;
  let component: ConfirmationPromptComponent;

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
      imports: [ConfirmationPromptComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationPromptComponent);
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

  it('emits an accept decision without cancelling', () => {
    const confirmSpy = spyOn(component.confirmed, 'emit');
    const cancelSpy = spyOn(component.cancelled, 'emit');

    buttons()[0].click();

    expect(confirmSpy).toHaveBeenCalledOnceWith({
      action: 'accept',
      personName: 'Ava Brooks',
    });

    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('emits a reject decision with the configured name', () => {
    fixture.componentRef.setInput('action', 'reject');
    fixture.componentRef.setInput('personName', 'Sam Rivera');
    fixture.detectChanges();

    const emitSpy = spyOn(component.confirmed, 'emit');

    buttons()[0].click();

    expect(emitSpy).toHaveBeenCalledOnceWith({
      action: 'reject',
      personName: 'Sam Rivera',
    });
  });

  it('emits cancellation without confirming', () => {
    const cancelSpy = spyOn(component.cancelled, 'emit');
    const confirmSpy = spyOn(component.confirmed, 'emit');

    buttons()[1].click();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('disables both buttons and prevents all events when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const confirmSpy = spyOn(component.confirmed, 'emit');
    const cancelSpy = spyOn(component.cancelled, 'emit');

    expect(buttons()[0].disabled).toBeTrue();
    expect(buttons()[1].disabled).toBeTrue();

    buttons()[0].click();
    buttons()[1].click();

    component.confirm();
    component.goBack();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('uses native non-submit buttons', () => {
    expect(buttons()[0].type).toBe('button');
    expect(buttons()[1].type).toBe('button');
  });
});
