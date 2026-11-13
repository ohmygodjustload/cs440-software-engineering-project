import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  forwardRef,
  inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type DropdownValue = string | number | null;

export interface DropdownOption {
  value: Exclude<DropdownValue, null>;
  label: string;
  disabled?: boolean;
}

let dropdownId = 0;

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DropdownComponent),
    multi: true
  }]
})
export class DropdownComponent implements ControlValueAccessor {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly generatedId = `app-dropdown-${++dropdownId}`;

  @Input() options: readonly DropdownOption[] = [];
  @Input() placeholder = 'Select an option';
  @Input() inputId = this.generatedId;
  @Input() ariaLabel = '';
  @Input() invalid = false;
  @Input() disabled = false;

  value: DropdownValue = null;
  open = false;
  activeIndex = -1;

  private onChange: (value: DropdownValue) => void = () => {};
  private onTouched: () => void = () => {};

  get listId(): string {
    return `${this.inputId}-options`;
  }

  get selectedLabel(): string {
    return this.options.find(option => option.value === this.value)?.label ?? this.placeholder;
  }

  toggle(): void {
    if (this.disabled) return;
    this.open ? this.close() : this.openMenu();
  }

  select(option: DropdownOption): void {
    if (option.disabled) return;
    this.value = option.value;
    this.onChange(option.value);
    this.onTouched();
    this.close();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    if (event.key === 'Escape') {
      this.close();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!this.open) {
        this.openMenu();
      } else if (this.activeIndex >= 0) {
        this.select(this.options[this.activeIndex]);
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open) this.openMenu();
      this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.openMenu();
      this.activeIndex = this.findEnabled(event.key === 'Home' ? 0 : this.options.length - 1, event.key === 'Home' ? 1 : -1);
      return;
    }

    if (event.key === 'Tab') {
      this.onTouched();
      this.close();
    }
  }

  optionId(index: number): string {
    return `${this.listId}-${index}`;
  }

  writeValue(value: DropdownValue): void {
    this.value = value;
    this.changeDetector.markForCheck();
  }

  registerOnChange(fn: (value: DropdownValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) this.close();
    this.changeDetector.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  closeFromOutside(event: MouseEvent): void {
    if (this.open && !this.element.nativeElement.contains(event.target as Node)) {
      this.onTouched();
      this.close();
    }
  }

  private openMenu(): void {
    this.open = true;
    const selected = this.options.findIndex(option => option.value === this.value && !option.disabled);
    this.activeIndex = selected >= 0 ? selected : this.findEnabled(0, 1);
  }

  private close(): void {
    this.open = false;
    this.activeIndex = -1;
  }

  private moveActive(direction: 1 | -1): void {
    if (!this.options.length) return;
    const start = this.activeIndex < 0
      ? (direction > 0 ? 0 : this.options.length - 1)
      : (this.activeIndex + direction + this.options.length) % this.options.length;
    this.activeIndex = this.findEnabled(start, direction);
  }

  private findEnabled(start: number, direction: 1 | -1): number {
    for (let step = 0; step < this.options.length; step++) {
      const index = (start + step * direction + this.options.length) % this.options.length;
      if (!this.options[index].disabled) return index;
    }
    return -1;
  }
}
