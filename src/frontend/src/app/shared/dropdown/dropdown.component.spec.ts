import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { DropdownComponent, DropdownOption } from './dropdown.component';

@Component({
  standalone: true,
  imports: [FormsModule, DropdownComponent],
  template: `
    <label for="test-category">Category</label>
    <app-dropdown
      inputId="test-category"
      name="category"
      [options]="options"
      [(ngModel)]="value"
    />
  `
})
class TestHostComponent {
  value = 'Medical';
  options: readonly DropdownOption[] = [
    { value: 'Medical', label: 'Medical' },
    { value: 'Beauty', label: 'Beauty' },
    { value: 'Fitness', label: 'Fitness' }
  ];
}

describe('DropdownComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders the selected value without a native select', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('[role="combobox"]');

    expect(trigger.textContent).toContain('Medical');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
  });

  it('opens a styled list and updates ngModel when an option is selected', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('[role="combobox"]');
    trigger.click();
    fixture.detectChanges();

    const options: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
    expect(options.length).toBe(3);

    options[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toBe('Beauty');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  it('supports keyboard navigation and selection', () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('[role="combobox"]');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toBe('Beauty');
  });
});
