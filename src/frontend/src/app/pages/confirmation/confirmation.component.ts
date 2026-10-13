import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

export type ConfirmationAction = 'accept' | 'reject';

export interface ConfirmationDecision {
  action: ConfirmationAction;
  personName: string;
}

@Component({
  selector: 'app-confirmation-prompt',
  standalone: true,
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationPromptComponent {
  @Input() action: ConfirmationAction = 'accept';
  @Input() personName = 'Ava Brooks';
  @Input() disabled = false;

  @Output() readonly confirmed = new EventEmitter<ConfirmationDecision>();
  @Output() readonly cancelled = new EventEmitter<void>();

  // Element reference tracking the template variable #actionModal
  @ViewChild('actionModal') private modalElement!: ElementRef<HTMLDialogElement>;

  get actionLabel(): string {
    return this.action === 'accept' ? 'Accept' : 'Reject';
  }

  // Open modal using native Web API
  public open(): void {
    if (this.modalElement?.nativeElement) {
      this.modalElement.nativeElement.showModal();
    }
  }

  // Close modal using native Web API
  public close(): void {
    if (this.modalElement?.nativeElement) {
      this.modalElement.nativeElement.close();
    }
  }

  confirm(): void {
    if (this.disabled) {
      return;
    }

    this.confirmed.emit({
      action: this.action,
      personName: this.personName,
    });

    this.close();
  }

  goBack(): void {
    if (this.disabled) {
      return;
    }

    this.cancelled.emit();
    this.close();
  }
}
