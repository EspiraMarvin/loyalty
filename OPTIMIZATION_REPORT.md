# Performance Optimization Report

## Overview

This summarizes the performance optimizations implemented for the Loyalty Offers Platform GraphQL resolver.

## Core Problem

The original resolver:

- Used single complex query with nested OR conditions across 3 offer types
- Relied on array fields for eligibilty (`eligibleCustomerTypes String[]`) - no index & array containment is slow

````prisma
model CashbackConfiguration {
  eligibleCustomerTypes String[]
}
- Performed string-based customer type hierarchy checks
- Had no database indexes for common query patterns
- No caching layer for frequently accessed data

**Impact**: Query complexity grew exponentially with data volume, creating unacceptable performance.

---

##  Key Optimizations

### 1. Array Fields replaced with Join Tables

Problem: `eligibleCustomerTypes String[]` requires full array scans, arrays can be efficiently indexed
Solution: Created `CashbackEligibleCustomerType` and `ExclusiveOfferEligibleCustomerType` join tables
Impact: Index-backed lookups, 100% elimination of array containment queries

```prisma
// BEFORE: eligibleCustomerTypes String[]
// AFTER: Join table with indexes
@@index([customerType])
@@index([cashbackConfigurationId, customerType])
````

---

### 2. Numeric Ranks for Hierarchy

Problem: String comparisons for customer type hierarchy ("New" < "Regular" < "VIP")  
Solution: Added `rank: Int` field (0-5 mapping)  
Impact: Single integer comparison `WHERE minRank <= userMaxRank` instead of multiple string checks

```prisma
model CustomerType {
  rank Int  // 0=NonCustomer, 1=New, 2=Infrequent, 3=Occasional, 4=Regular, 5=VIP
  @@index([userId, rank])
}

model LoyaltyTier {
  id              String  @id
  name            String
  minCustomerType String  // "New", "Regular", "VIP" (for display)
  minRank         Int     // numeric threshold

  @@index([minRank, isActive])  // indexed for range queries
}
```

```typescript
//  BEFORE
const eligibleTypes = getHierarchy(userType) // ['New', 'Infrequent', 'Occasional', 'Regular']
WHERE minCustomerType IN (eligibleTypes)  // Multiple comparisons

// AFTER: Single database comparison
WHERE minRank <= 4  // User rank = 4 (Regular)
```

---

### 3. Split Complex OR into 3 Parallel Queries

Problem: Single query with top-level OR across all offer types - database couldn't optimize  
Solution: 3 focused queries executed in parallel with `Promise.all`  
Impact: Simpler query plans, optimal index usage per offer type, Map in-memory merging

```typescript
const [cashbackOutlets, exclusiveOutlets, loyaltyOutlets] = await Promise.all([
  this.fetchCashbackOutlets(...),   // Query 1
  this.fetchExclusiveOutlets(...),  // Query 2
  this.fetchLoyaltyOutlets(...)     // Query 3
]);
// Merge in memory using Map, which is fast with fast lookups
```

---

### 4. Strategic Database Indexing

Added composite indexes for common query patterns:

```prisma
// Cashback & Exclusive Offers
@@index([merchantId, isActive])
@@index([isActive, deletedAt])
@@index([startDate, endDate])

// Customer Types
@@index([userId])
@@index([merchantId, userId])
@@index([userId, rank])

// Loyalty Tiers
@@index([minRank, isActive])

// Join Tables
@@index([customerType])
@@index([cashbackConfigurationId, customerType])
```

Impact: Sequential(reads every row in the table) & Index (uses B trees) scans covering indexes eliminate table lookups

---

### 5. Redis Caching (User Context Only)

Problem: Every request fetched user's customer types from database  
Solution: Cache user context with 3-minute TTL
I was assuming user-merchant relationship change rarely hence less complex cache invalidation mechanism
Impact: higher cache hit rate, eliminates 1 DB query per request

---

### 6. DRY Query Building

Problem: Eligibility logic duplicated in `where` and `include.where`  
Solution: Created `buildCashbackWhere()` and `buildExclusiveOfferWhere()` helper methods  
Impact: Single source of truth, easier maintenance, consistent logic

---

### 7. Performance Monitoring

**Implemented**:

- Slow query logging (> 500ms) in PrismaService
- Resolver timing via PerformanceLoggingInterceptor

Impact: Identify bottlenecks, monitor regressions, production insights

---

## Key Decisions & Trade-offs

### No Pagination

- User filtering was not necessary. Focus was on query performance, not pagination. Would implement cursor-based pagination for consistency if the need arised.

### Limited Redis Caching

- Assessment requires real-time offer availability. Caching offers needs complex invalidation mechanism. User context is safe though as it changes rarely, 3-min TTL for showcasing.

---

### Functional Requirements

- Real-time offer availability (offers always fresh)
- Date ranges respected
- Budget tracking works (post-query filtering due to Prisma limitation)
- Customer type eligibility accurate
- GraphQL schema backward compatible

### Performance Requirements

- Query complexity reduced (split OR to parallel queries)
- Array operations eliminated (join tables)
- Scalability improved
- Database optimized (indexing)

---
