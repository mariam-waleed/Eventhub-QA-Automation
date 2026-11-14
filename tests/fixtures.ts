import {
  test as base,
  expect,
  type APIRequestContext,
  type BrowserContext,
} from '@playwright/test';

import { BookingsApi } from '../src/bookings.api';
import { EventDetailsPage } from '../src/pages/event-details.page';
import { EventsPage } from '../src/pages/events.page';
import { HomePage } from '../src/pages/home.page';
import { LoginPage } from '../src/pages/login.page';
import { MyBookingsPage } from '../src/pages/my-bookings.page';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

type AuthState = Awaited<
  ReturnType<BrowserContext['storageState']>
>;

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

type WorkerFixtures = {
  uiAuthCache: {
    state?: AuthState;
  };
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  // Authentication is cached in memory for this worker.
  uiAuthCache: [
    async ({}, use) => {
      await use({});
    },
    { scope: 'worker' },
  ],

  // Each test gets a fresh context with the cached authentication.
  storageState: async ({ uiAuthCache }, use) => {
    await use(
      uiAuthCache.state ?? {
        cookies: [],
        origins: [],
      },
    );
  },

  authenticatedApi: async ({ playwright }, use) => {
    const loginApi = await playwright.request.newContext({
      baseURL: requiredEnv('API_BASE_URL'),
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
      baseURL: requiredEnv('API_BASE_URL'),
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

  ui: async ({ page, uiAuthCache }, use) => {
    // Only the first UI test in this worker performs the login.
    if (!uiAuthCache.state) {
      const loginPage = new LoginPage(page);

      await loginPage.open();
      await loginPage.signIn(
        requiredEnv('TEST_USER_EMAIL'),
        requiredEnv('TEST_USER_PASSWORD'),
      );

      uiAuthCache.state = await page.context().storageState();
    }

    // Booking tracking remains separate for every test.
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

      for (const reference of [...references]) {
        try {
          await myBookings.open();
          await myBookings.cancel(reference);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);

          failures.push(`${reference}: ${message}`);
        }
      }

      if (failures.length > 0) {
        throw new Error(
          `UI booking cleanup failed:\n${failures.join('\n')}`,
        );
      }
    }
  },
});

export { expect };