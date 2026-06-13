#!/bin/sh
set -e

# Run database seed / push
npx prisma db push --accept-data-loss

# Start the server
exec "$@"
