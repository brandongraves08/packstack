#!/bin/bash

# Packstack WSL2 Run Script
echo "Starting Packstack in WSL2..."

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default mode is 'dev' but can be changed to 'test'
MODE=${1:-dev}

# Create the uploads directory if it doesn't exist
mkdir -p ./server/uploads

# Function to check if a port is in use
check_port() {
  local port=$1
  local service=$2
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}Error: Port $port is already in use. Cannot start $service.${NC}"
    return 1
  fi
  return 0
}

# Kill all existing related processes to ensure clean start
cleanup() {
  echo -e "${YELLOW}Cleaning up processes...${NC}"
  if [ ! -z "$BACKEND_PID" ]; then
    echo "Stopping backend server (PID: $BACKEND_PID)"
    kill -9 $BACKEND_PID 2>/dev/null || true
  fi
  if [ ! -z "$FRONTEND_PID" ]; then
    echo "Stopping frontend server (PID: $FRONTEND_PID)"
    kill -9 $FRONTEND_PID 2>/dev/null || true
  fi
  echo -e "${GREEN}Cleanup complete.${NC}"
}

# Set the trap for cleanup
trap cleanup EXIT INT TERM

# Ensure ports are available
check_port 5001 "Flask backend" || exit 1
check_port 5173 "Vite frontend" || exit 1

# Start the backend server in a background process
echo -e "${BLUE}Starting Flask backend server on port 5001...${NC}"
cd server
python app.py &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to initialize and check if it started successfully
sleep 3
if ! ps -p $BACKEND_PID > /dev/null; then
  echo -e "${RED}Error: Backend server failed to start.${NC}"
  exit 1
fi
echo -e "${GREEN}Backend server started successfully with PID: $BACKEND_PID${NC}"

# Run mode based on argument
if [ "$MODE" = "test" ]; then
  # Start frontend in the background for testing
  echo -e "${BLUE}Starting React/Vite frontend on port 5173 in background for testing...${NC}"
  npm run dev &
  FRONTEND_PID=$!
  
  # Wait for the frontend to initialize
  sleep 5
  
  # Run Playwright tests
  echo -e "${YELLOW}Running Playwright tests...${NC}"
  npx playwright test
  TEST_EXIT_CODE=$?
  
  # Display test result
  if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}Playwright tests completed successfully.${NC}"
  else
    echo -e "${RED}Playwright tests failed with exit code: $TEST_EXIT_CODE${NC}"
  fi
  
  # Cleanup and exit with test exit code
  cleanup
  exit $TEST_EXIT_CODE
else
  # Start the frontend server in standard dev mode
  echo -e "${GREEN}Starting React/Vite frontend on port 5173...${NC}"
  npm run dev
  
  # This will run until the npm process ends, then the trap will clean up
  echo "Packstack servers have been stopped."
fi
