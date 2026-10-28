import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { EditAccountComponent } from './edit-account.component';

describe('EditAccountComponent', () => {
  let fixture: ComponentFixture<EditAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditAccountComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(EditAccountComponent);
    fixture.detectChanges();
  });

  it('renders the Edit Account page heading', () => {
    const el: HTMLElement = fixture.nativeElement;

    expect(fixture.componentInstance).toBeTruthy();
    expect(el.querySelector('.greeting h1')?.textContent).toContain('Edit Account');
  });
});
