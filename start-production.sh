#!/bin/bash
# Production startup script for SwapShelf
# Starts both Next.js server and Chat service

set -e

echo "Starting SwapShelf production services..."

# Start Next.js server
echo "Starting Next.js server..."
NODE_ENV=production node .next/standalone/server.js &
NEXT_PID=$!

# Start Chat service
echo "Starting Chat service..."
cd mini-services/chat-service && npx tsx index.ts &
CHAT_PID=$!

cd - > /dev/null || true

echo "Next.js PID: $NEXT_PID"
echo "Chat service PID: $CHAT_PID"

# Handle graceful shutdown
trap 'kill $NEXT_PID $CHAT_PID 2>/dev/null || true; exit' SIGTERM SIGINT

wait