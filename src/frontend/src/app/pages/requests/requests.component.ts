import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AdminProviderRequest {
  id: string;
  name: string;
  status: string;
  providerType: string | null;
}

@Component({
  selector: 'app-arequests',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css',
})
export class RequestsComponent implements OnInit {
  loading = true;
  error: string | null = null;
  requests: AdminProviderRequest[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    // Replace this stub with the pending-requests API when it is available.
    try {
      this.requests = [
        {
          id: 'pr-101',
          name: 'Brendan Lambrecht',
          status: 'Pending',
          providerType: null,
        },
        {
          id: 'pr-102',
          name: 'Andrew Peirce',
          status: 'Pending',
          providerType: 'Fitness',
        },
        {
          id: 'pr-103',
          name: 'Maya Chen',
          status: 'Pending',
          providerType: 'Fitness, Beauty',
        },
        {
          id: 'pr-104',
          name: 'Ava Brooks',
          status: 'Pending',
          providerType: null,
        },
      ];
      this.loading = false;
    } catch {
      this.error = 'Could not load provider requests.';
      this.loading = false;
    }
  }
}