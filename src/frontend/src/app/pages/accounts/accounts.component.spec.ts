import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountsComponent } from './accounts.component';

describe('AccountsComponent', () => {
  let fixture: ComponentFixture<AccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    fixture.detectChanges();
  });

  it('renders the Accounts page heading', () => {
    const el: HTMLElement = fixture.nativeElement;

    expect(fixture.componentInstance).toBeTruthy();
    expect(el.querySelector('.greeting h1')?.textContent).toContain('Accounts');
  });
});
