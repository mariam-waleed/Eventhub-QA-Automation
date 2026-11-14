import { randomUUID } from 'node:crypto';

export function createContactDetails() {
  return {
    name: `QA ${randomUUID().slice(0, 8)}`,
    email: `qa-${randomUUID()}@example.com`,
    phone: '+919876543210',
  };
}

export const invalidQuantityCases = [
  {
    id: 'US114-API-003',
    description: 'Reject zero tickets',
    quantity: 0,
  },
  {
    id: 'US114-API-004',
    description: 'Reject more than ten tickets',
    quantity: 11,
  },
  {
    id: 'US114-API-005',
    description: 'Reject fractional tickets',
    quantity: 1.5,
  },
];