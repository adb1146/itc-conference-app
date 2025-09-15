#!/bin/bash

# Test script for Tom King - Research Agent flow
echo "========================================"
echo "Testing Research Agent for Tom King"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="${BASE_URL:-http://localhost:3011}"

# Generate a unique session ID
SESSION_ID="tom_king_test_$(date +%s)"
echo -e "${BLUE}Session ID: ${SESSION_ID}${NC}"
echo ""

# Function to send message and display response
send_message() {
    local message="$1"
    local step="$2"

    echo -e "${YELLOW}Step $step:${NC}"
    echo -e "Sending: \"$message\""
    echo ""

    # Send the request and capture response
    response=$(curl -s -X POST "${BASE_URL}/api/chat/stream" \
        -H "Content-Type: application/json" \
        -d "{
            \"message\": \"$message\",
            \"sessionId\": \"$SESSION_ID\",
            \"userPreferences\": {}
        }" 2>/dev/null)

    # Extract and display key parts of response
    if [[ ! -z "$response" ]]; then
        echo -e "${GREEN}Response received${NC}"
        # Extract content from streaming response
        echo "$response" | grep -o '"content":"[^"]*"' | head -3 | while read -r line; do
            content=$(echo "$line" | sed 's/"content":"//g' | sed 's/"$//g' | sed 's/\\n/\n/g')
            echo "$content"
        done
    else
        echo -e "${GREEN}Waiting for server response...${NC}"
    fi

    echo ""
    echo "---"
    sleep 2
}

# Start the test flow
echo -e "${BLUE}Starting Research Agent test for Tom King...${NC}"
echo ""

# Step 1: Initial request
send_message \
    "Build me a personalized agenda for the conference" \
    "1"

# Step 2: Provide name
send_message \
    "I'm Tom King" \
    "2"

# Step 3: Provide company (you can modify this)
send_message \
    "I work at a major insurance company" \
    "3"

# Step 4: Provide role (you can modify this)
send_message \
    "I'm in technology leadership" \
    "4"

# Step 5: Confirm and build agenda
send_message \
    "Yes, that looks good. Build my agenda" \
    "5"

# Final status
echo ""
echo -e "${GREEN}Test Complete!${NC}"
echo ""
echo "The system should have:"
echo "1. ✓ Recognized you as a guest user"
echo "2. ✓ Collected your information (Tom King)"
echo "3. ✓ Performed web research on your background"
echo "4. ✓ Built a personalized agenda"
echo "5. ✓ Offered to save the agenda"
echo ""
echo -e "${BLUE}Check the browser at ${BASE_URL}/chat for the full experience${NC}"