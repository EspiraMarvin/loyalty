# Loyalty Offers Platform

A high-performance offers management system built with NestJS, GraphQL, Prisma ORM, Redis, and PostgreSQL.

## Project Overview

This project implements the baseline for the "Offers Resolver Performance Optimization"

- Platform connects users with merchants and their offers across three types:

1. Cashback Configurations - Percentage based cashback on purchases
2. Exclusive Offers - Special time bound promotions
3. Loyalty Programs - Points based reward systems

## Setup

### Option 1: Docker

```bash
git clone https://github.com/EspiraMarvin/loyalty

cd loyalty-offers

docker compose up -d

```

### Option 2: Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env

- Edit .env with your database credentials

# 3. setup database
pnpm prisma generate
pnpm prisma db push --force-reset || pnpm prisma:migrate
pnpm prisma db seed

# 4. start server
pnpm start:dev
```

Visit GraphQL Playground at `http://localhost:3000/graphql`

### Sample Users

- `user-1`: Regular at Coffee Shop, VIP at Electronics
- `user-2`: New at Coffee Shop, Occasional at Fashion Boutique

## Available Scripts

```bash
# Development
pnpm start:dev              # Start dev server with watch
pnpm start:debug            # Start with debugger

# Building
pnpm build                  # Build for production
pnpm start:prod             # Run production build

# Database
pnpm prisma:generate        # Generate Prisma client
pnpm prisma:migrate         # Run migrations
pnpm prisma:seed            # Seed database
pnpm db:reset               # Reset and reseed database

# Code Quality
pnpm lint                   # Run ESLint
pnpm format                 # Format code with Prettier
pnpm test                   # Run unit tests
pnpm test:e2e               # Run e2e tests
```

## Query tests:

Provided in queries.md [playground_queries.graphql](./queries.graphql)

## Query Optimization Report:

Provided in queries.md [OPTIMIZATION_REPORT.md](./OPTIMIZATION_REPORT.md)

### ERD

```erd
Merchant
   │
   ├───< Outlet
   │        │
   │        ├──< PaybillOrTill
   │        │
   │        ├── M:N ─── CashbackConfiguration
   │        │             │
   │        │             ├──< CashbackConfigurationTier
   │        │             └──< CashbackEligibleCustomerType
   │        │
   │        └── M:N ─── ExclusiveOffer
   │                      └──< ExclusiveOfferEligibleCustomerType
   │
   ├───< CashbackConfiguration
   ├───< ExclusiveOffer
   ├───< CustomerType
   │
   └─── 1:1 ─── LoyaltyProgram
                    │
                    ├──< LoyaltyTier
                    └──< MerchantLoyaltyReward
```
