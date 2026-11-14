import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/header.component';

export class HomePage {
  readonly header: HeaderComponent;
  readonly browseEventsButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);

    this.browseEventsButton = page.getByRole('link', {
      name: /Browse Events/,
    });
  }

  async open() {
    await this.page.goto('/');
  }

  async browseEvents() {
    await this.browseEventsButton.click();
  }
}