import type { Locator, Page } from '@playwright/test';
import { HeaderComponent } from '../components/header.component';

export class EventsPage {
  readonly header: HeaderComponent;
  readonly heading: Locator;

  constructor(private readonly page: Page) {
    this.header = new HeaderComponent(page);

    this.heading = page.getByRole('heading', {
      name: 'Upcoming Events',
      exact: true,
    });
  }

  async openEvent(title: string) {
    const card = this.page.getByRole('article').filter({
      has: this.page.getByText(title, { exact: true }),
    });

    await card.getByTestId('book-now-btn').click();
  }
}