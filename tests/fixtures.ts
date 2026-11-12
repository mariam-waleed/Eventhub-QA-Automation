import {
  test as base,
  expect,
  type APIRequestContext,
} from '@playwright/test';

import { BookingsApi } from '../src/bookings.api';

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

type Fixtures = {
  authenticatedApi: APIRequestContext;
  bookings: BookingsApi;
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
});

export { expect };