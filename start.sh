#!/bin/sh

echo "Waiting for database to be ready..."
sleep 5

echo "Syncing database schema..."
prisma db push --accept-data-loss

echo "Seeding database..."
prisma db seed

echo "Starting application..."
node dist/main