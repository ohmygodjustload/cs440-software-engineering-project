import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

type SignupAccountType = 'client' | 'serviceProvider';

@Component({
  selector: 'app-signup-selection',
  imports: [RouterLink],
  templateUrl: './signup-selection.component.html',
  styleUrl: './signup-selection.component.css'
})
export class SignupSelectionComponent {
  private readonly router = inject(Router);

  selectedType: SignupAccountType | null = null;

  select(type: SignupAccountType): void {
    this.selectedType = type;
  }

  continue(): void {
    if (!this.selectedType) {
      return;
    }

    void this.router.navigateByUrl(
      this.selectedType === 'serviceProvider' ? '/signup/provider' : '/signup/user'
    );
  }
}