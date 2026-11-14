import {
  test as base,
  expect,
  type APIRequestContext,
} from '@playwright/test';
import { LoginPage } from '../src/pages/login.page';
import { BookingsApi } from '../src/bookings.api';
import { EventDetailsPage } from '../src/pages/event-details.page';
import { MyBookingsPage } from '../src/pages/my-bookings.page';
import { HomePage } from '../src/pages/home.page';
import { EventsPage } from '../src/pages/events.page';
function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}
type UiPages = {
  home: HomePage;
  events: EventsPage;
  eventDetails: EventDetailsPage;
  myBookings: MyBookingsPage;
};

type Fixtures = {
  authenticatedApi: APIRequestContext;
  bookings: BookingsApi;
  ui: UiPages;
};

export const test = base.extend<Fixtures>({
  authenticatedApi: async ({ playwright }, use) => {
    const baseURL = requiredEnv('API_BASE_URL');

    const loginApi = await playwright.request.newContext({
      baseURL,
    });

    let token: string;

    try {
      const response = await loginApi.post('auth/login', {
          maxRetries: 1,
        data: {
          email: requiredEnv('TEST_USER_EMAIL'),
          password: requiredEnv('TEST_USER_PASSWORD'),
        },
      });

      if (response.status() !== 200) {
        throw new Error(`Login failed: HTTP ${response.status()}`);
      }

      const body = await response.json();

      if (
        body.success !== true ||
        typeof body.token !== 'string' ||
        body.token.trim() === ''
      ) {
        throw new Error('Login did not return a valid token.');
      }

      token = body.token;
    } finally {
      await loginApi.dispose();
    }

    const api = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      await use(api);
    } finally {
      await api.dispose();
    }
  },

  bookings: async ({ authenticatedApi }, use) => {
    const bookings = new BookingsApi(authenticatedApi);

    try {
      await use(bookings);
    } finally {
      await bookings.cleanup();
    }
  },
ui: async ({ page }, use) => {
  const loginPage = new LoginPage(page);

  await loginPage.open();

  await loginPage.signIn(
    requiredEnv('TEST_USER_EMAIL'),
    requiredEnv('TEST_USER_PASSWORD'),
  );

  const references = new Set<string>();

  const eventDetails = new EventDetailsPage(page, reference => {
    references.add(reference);
  });

  const myBookings = new MyBookingsPage(page, reference => {
  references.delete(reference);
});

  try {
    await use({
  home: new HomePage(page),
  events: new EventsPage(page),
  eventDetails,
  myBookings,
});
  } finally {
    const failures: string[] = [];

    for (const reference of references) {
      try {
        await myBookings.open();
        await myBookings.cancel(reference);
      } catch {
        failures.push(reference);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `UI cleanup failed for booking references: ${failures.join(', ')}`,
      );
    }
  }
},
});

export { expect };