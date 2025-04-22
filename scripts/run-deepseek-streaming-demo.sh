#!/bin/bash

# Load environment variables if .env file exists
if [ -f ".env" ]; then
  echo "Loading DEEPSEEK_API_KEY from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# Check if DEEPSEEK_API_KEY is set
if [ -z "$DEEPSEEK_API_KEY" ]; then
  echo "ERROR: DEEPSEEK_API_KEY environment variable is not set!"
  echo "Please create a .env file with DEEPSEEK_API_KEY=your_api_key or export it."
  exit 1
fi

echo "Starting DeepSeekStreamingSDK Demo..."

# First compile the TypeScript file to JavaScript to make it available for import
echo "Compiling TypeScript files..."
npx tsc --esModuleInterop --module NodeNext --outDir ./dist ./src/deepseek-sdk-streaming.ts

# Run the JS file directly with the experimental modules flag
node --experimental-vm-modules ./scripts/deepseek-streaming-demo.js