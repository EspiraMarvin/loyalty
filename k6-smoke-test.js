import http from 'k6/http';
import { check, sleep } from 'k6';

// Smoke test configuration (quick validation)
export const options = {
  vus: 5, // 5 virtual users
  duration: '30s', // Run for 30 seconds
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
    http_req_failed: ['rate<0.01'],    // Error rate should be below 1%
  },
};

const GRAPHQL_URL = __ENV.GRAPHQL_URL || 'http://localhost:3000/graphql';

export default function () {
  // Simple query to test basic functionality
  const query = `
    query GetOffers {
      offers(filter: { userId: "user-1" }) {
        totalCount
        outlets {
          id
          name
          Merchant {
            businessName
          }
        }
      }
    }
  `;

  const payload = JSON.stringify({ query });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(GRAPHQL_URL, payload, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => JSON.parse(r.body).data !== undefined,
    'no errors': (r) => !JSON.parse(r.body).errors,
    'response time OK': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

export function setup() {
  console.log('Running smoke test...');
  console.log(`Target: ${GRAPHQL_URL}`);
}

export function teardown() {
  console.log('Smoke test completed!');
}
