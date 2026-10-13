import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewRequestComponent } from './review-request.component';

describe('ReviewRequestComponent', () => {
  let fixture: ComponentFixture<ReviewRequestComponent>;
  let component: ReviewRequestComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewRequestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewRequestComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
    await fixture.whenStable();
  });


  it('updates and emits typed comments', async () => {
    const emitted = spyOn(component.commentsChange, 'emit');
    const textarea = element.querySelector('textarea')!;

    textarea.value = 'Credentials reviewed.';
    textarea.dispatchEvent(new Event('input'));

    await fixture.whenStable();

    expect(component.comments).toBe('Credentials reviewed.');
    expect(emitted).toHaveBeenCalledWith('Credentials reviewed.');
  });

  it('emits approve and reject decisions with comments', () => {
    const emitted = spyOn(component.decision, 'emit');
    component.comments = 'Review notes';

    const approve =
      element.querySelector<HTMLButtonElement>('.approve')!;

    const reject =
      element.querySelector<HTMLButtonElement>('.reject')!;

    expect(approve.textContent?.trim()).toBe('Approve');
    expect(reject.textContent?.trim()).toBe('Reject');

    approve.click();

    expect(emitted).toHaveBeenCalledWith({
      decision: 'approve',
      comments: 'Review notes',
    });

    reject.click();

    expect(emitted).toHaveBeenCalledWith({
      decision: 'reject',
      comments: 'Review notes',
    });
  });

  it('disables editing and decisions while submitting', () => {
    const emitted = spyOn(component.decision, 'emit');

    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    expect(element.querySelector('textarea')!.disabled).toBeTrue();

    expect(
      element.querySelector<HTMLButtonElement>('.approve')!.disabled,
    ).toBeTrue();

    expect(
      element.querySelector<HTMLButtonElement>('.reject')!.disabled,
    ).toBeTrue();

    component.decide('approve');

    expect(emitted).not.toHaveBeenCalled();
  });

  it('emits navigation requests', () => {
    const emitted = spyOn(component.pageRequested, 'emit');

    element.querySelector<HTMLButtonElement>('.page-link')!.click();

    expect(emitted).toHaveBeenCalledWith('Home');
  });
});
