import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('graphql_errors');
const queryDuration = new Trend('query_duration_ms');

// Load test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 },   // Ramp up to 50 users over 1 min
    { duration: '2m', target: 50 },   // Stay at 50 users for 2 min
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users for 1 min
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'],    // Error rate should be below 5%
    graphql_errors: ['rate<0.01'],     // GraphQL errors below 1%
  },
};

// GraphQL endpoint
const GRAPHQL_URL = __ENV.GRAPHQL_URL || 'http://localhost:3000/graphql';

// Test queries with different scenarios
const queries = {
  // Scenario 1: Get all offers for User-1 (VIP customer)
  userAllOffers: {
    query: `
      query GetOffersForUser1 {
        offers(filter: { userId: "user-1" }) {
          totalCount
          outlets {
            id
            name
            Merchant {
              businessName
              category
            }
            CashbackConfigurations {
              name
              netCashbackBudget
              usedCashbackBudget
              CashbackConfigurationTiers {
                percentage
              }
            }
            ExclusiveOffers {
              name
              description
            }
          }
        }
      }
    `,
    name: 'User All Offers',
  },

  // Scenario 2: Get offers for User-2 (New customer)
  newCustomerOffers: {
    query: `
      query GetOffersForUser2 {
        offers(filter: { userId: "user-2" }) {
          totalCount
          outlets {
            id
            name
            CashbackConfigurations {
              name
            }
            ExclusiveOffers {
              name
            }
          }
        }
      }
    `,
    name: 'New Customer Offers',
  },

  // Scenario 3: Category filter
  categoryFilter: {
    query: `
      query GetCategoryOffers {
        offers(filter: { userId: "user-1", category: "Food & Beverage" }) {
          totalCount
          outlets {
            name
            Merchant {
              category
            }
          }
        }
      }
    `,
    name: 'Category Filter',
  },

  // Scenario 4: Cashback percentage filter
  percentageFilter: {
    query: `
      query GetHighCashbackOffers {
        offers(filter: { userId: "user-1", minPercentage: 5, maxPercentage: 15 }) {
          totalCount
          outlets {
            name
            CashbackConfigurations {
              name
              CashbackConfigurationTiers {
                percentage
              }
            }
          }
        }
      }
    `,
    name: 'Percentage Filter',
  },

  // Scenario 5: Search functionality
  searchOffers: {
    query: `
      query SearchOffers {
        offers(filter: { userId: "user-1", search: "Electronics" }) {
          totalCount
          outlets {
            name
            Merchant {
              businessName
            }
          }
        }
      }
    `,
    name: 'Search Offers',
  },

  // Scenario 6: Anonymous user (no userId)
  anonymousOffers: {
    query: `
      query GetAnonymousOffers {
        offers(filter: {}) {
          totalCount
          outlets {
            name
            Merchant {
              businessName
            }
            CashbackConfigurations {
              name
            }
            ExclusiveOffers {
              name
            }
          }
        }
      }
    `,
    name: 'Anonymous User',
  },

  // Scenario 7: Full details with loyalty program
  fullDetails: {
    query: `
      query GetFullOfferDetails {
        offers(filter: { userId: "user-1" }) {
          totalCount
          outlets {
            id
            name
            description
            Merchant {
              businessName
              category
              LoyaltyProgram {
                name
                pointsIssuedLimit
                pointsUsedInPeriod
                LoyaltyTiers {
                  name
                  minCustomerType
                }
                MerchantLoyaltyRewards {
                  name
                  pointsCost
                }
              }
            }
            CashbackConfigurations {
              name
              startDate
              endDate
              CashbackConfigurationTiers {
                name
                percentage
              }
            }
            ExclusiveOffers {
              name
              description
              startDate
              endDate
            }
          }
        }
      }
    `,
    name: 'Full Details',
  },
};

// Helper function to execute GraphQL query
function executeQuery(queryObj) {
  const payload = JSON.stringify({ query: queryObj.query });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: queryObj.name },
  };

  const startTime = Date.now();
  const response = http.post(GRAPHQL_URL, payload, params);
  const duration = Date.now() - startTime;

  // Record custom metrics
  queryDuration.add(duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined;
      } catch (e) {
        return false;
      }
    },
    'no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors;
      } catch (e) {
        return false;
      }
    },
    'response time < 2000ms': () => duration < 2000,
    'response time < 1000ms': () => duration < 1000,
    'response time < 500ms': () => duration < 500,
  });

  // Track GraphQL errors
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      errorRate.add(!!body.errors);
      
      if (body.errors) {
        console.error(`GraphQL Error in ${queryObj.name}:`, JSON.stringify(body.errors));
      }
    } catch (e) {
      errorRate.add(true);
    }
  } else {
    errorRate.add(true);
  }

  return { response, duration, success };
}

// Main test function
export default function () {
  // Randomly select a query scenario (weighted distribution)
  const random = Math.random();
  let selectedQuery;

  if (random < 0.3) {
    // 30% - Most common: Get all offers
    selectedQuery = queries.userAllOffers;
  } else if (random < 0.5) {
    // 20% - New customer
    selectedQuery = queries.newCustomerOffers;
  } else if (random < 0.65) {
    // 15% - Category filter
    selectedQuery = queries.categoryFilter;
  } else if (random < 0.8) {
    // 15% - Percentage filter
    selectedQuery = queries.percentageFilter;
  } else if (random < 0.9) {
    // 10% - Search
    selectedQuery = queries.searchOffers;
  } else if (random < 0.95) {
    // 5% - Anonymous
    selectedQuery = queries.anonymousOffers;
  } else {
    // 5% - Full details (most expensive query)
    selectedQuery = queries.fullDetails;
  }

  const result = executeQuery(selectedQuery);

  // Log slow queries
  if (result.duration > 1000) {
    console.warn(`Slow query detected: ${selectedQuery.name} took ${result.duration}ms`);
  }

  // Simulate user think time (500ms - 2s)
  sleep(Math.random() * 1.5 + 0.5);
}

// Setup function (runs once per VU at start)
export function setup() {
  console.log(`Starting load test against: ${GRAPHQL_URL}`);
  console.log('Test stages:');
  console.log('  - Ramp up to 10 users (30s)');
  console.log('  - Ramp up to 50 users (1m)');
  console.log('  - Stay at 50 users (2m)');
  console.log('  - Spike to 100 users (30s)');
  console.log('  - Stay at 100 users (1m)');
  console.log('  - Ramp down (30s)');
  console.log('');
  
  // Health check
  const healthCheck = http.get(`${GRAPHQL_URL.replace('/graphql', '')}/`);
  if (healthCheck.status !== 200) {
    console.error('Health check failed! Make sure the server is running.');
  }
}

// Teardown function (runs once at end)
export function teardown(data) {
  console.log('Load test completed!');
}
