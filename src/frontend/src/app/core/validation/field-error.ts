import { AbstractControl } from '@angular/forms';

/**
 * field-error.ts — turns Angular form control errors into short, human-readable messages.
 *
 * Purpose: shared by the client and provider signup forms so a required (or otherwise invalid)
 * field is flagged inline the moment the user tries to submit, instead of the form silently
 * doing nothing. Each control reports its own message once it has been touched.
 */

/**
 * Returns an inline error message for a control, or null when the control is untouched or valid.
 *
 * @param control The form control to inspect (may be null).
 * @param label The field's display name, used to build messages such as "Email is required.".
 */
export function fieldErrorMessage(
  control: AbstractControl | null,
  label: string
): string | null {
  if (!control || !control.touched || !control.errors) {
    return null;
  }

  if (control.hasError('required')) {
    return `${label} is required.`;
  }

  if (control.hasError('email')) {
    return 'Enter a valid email address.';
  }

  if (control.hasError('minlength')) {
    const required = control.getError('minlength').requiredLength as number;
    return `${label} must be at least ${required} characters.`;
  }

  if (control.hasError('maxlength')) {
    const max = control.getError('maxlength').requiredLength as number;
    return `${label} must be ${max} characters or fewer.`;
  }

  return `${label} is invalid.`;
}
