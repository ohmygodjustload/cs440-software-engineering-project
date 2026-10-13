import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Make sure your relative path accurately matches your file structure here
import { 
  ConfirmationPromptComponent, 
  ConfirmationAction, 
  ConfirmationDecision 
} from '../confirmation/confirmation.component';

export type AdminPage = 'Home' | 'Requests' | 'Accounts' | 'Appointments';

export interface ReviewDecision {
  decision: 'approve' | 'reject';
  comments: string;
}

@Component({
  selector: 'app-credential-review',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    ConfirmationPromptComponent // Allows the template to recognize your dialog markup tag
  ],
  templateUrl: './review-request.component.html',
  styleUrls: ['./review-request.component.css'],
})
export class ReviewRequestComponent {
  @Input() applicantName = 'Ava Brooks';
  @Input() status = 'Pending review';

  @Input() beautyLicense = 'DEMO-COS-104';
  @Input() beautyExperience = '4 years of salon experience.';

  @Input() fitnessCertification = 'DEMO-FIT-208';
  @Input() fitnessExperience = '2 years of fitness coaching.';

  @Input() medicalCredentials = 'No medical credential submitted.';
  @Input() comments = '';
  @Input() submitting = false;

  @Output() commentsChange = new EventEmitter<string>();
  @Output() decision = new EventEmitter<ReviewDecision>();
  @Output() pageRequested = new EventEmitter<AdminPage>();

  // Queries the local layout template for the child dialog component methods
  @ViewChild('confirmationPrompt') private dialogComponent!: ConfirmationPromptComponent;

  // Holds local layout view state passed down into dialog property bindings
  public currentAction: ConfirmationAction = 'accept';

  // Fixed syntax typo: converted array values definition properly into typed array bracket signatures
  readonly pages: AdminPage[] = [
    'Home',
    'Requests',
    'Accounts',
    'Appointments',
  ];

  updateComments(value: string): void {
    this.comments = value;
    this.commentsChange.emit(value);
  }

  // Prepares component configurations and triggers dialog presentation overlay
  openDialog(type: 'approve' | 'reject'): void {
    if (this.submitting) {
      return;
    }
    this.currentAction = type === 'approve' ? 'accept' : 'reject';
    this.dialogComponent.open();
  }

  // Bridging method triggered once internal popup confirmation bubbles a value upward
  handleDialogConfirmed(decisionData: ConfirmationDecision): void {
    const finalDecision: ReviewDecision['decision'] = 
      decisionData.action === 'accept' ? 'approve' : 'reject';
    
    this.decide(finalDecision);
  }

  decide(decision: ReviewDecision['decision']): void {
    if (this.submitting) {
      return;
    }

    this.decision.emit({
      decision,
      comments: this.comments,
    });
  }
}
