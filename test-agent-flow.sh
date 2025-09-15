#!/bin/bash

# Test script for User Research Agent → Smart Agenda flow
# This tests the complete conversational flow for an unauthenticated user

echo "================================================"
echo "Testing User Research Agent → Smart Agenda Flow"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="${BASE_URL:-http://localhost:3011}"

# Generate a unique session ID for this test
SESSION_ID="test_session_$(date +%s)_$(uuidgen | tr '[:upper:]' '[:lower:]' | head -c 8)"
echo -e "${BLUE}Session ID: ${SESSION_ID}${NC}"
echo ""

# Function to send message to chat API
send_message() {
    local message="$1"
    local step_name="$2"

    echo -e "${YELLOW}[$step_name]${NC}"
    echo -e "User: \"$message\""
    echo ""

    # Send request to stream API
    response=$(curl -s -X POST "${BASE_URL}/api/chat/stream" \
        -H "Content-Type: application/json" \
        -d "{
            \"message\": \"$message\",
            \"sessionId\": \"$SESSION_ID\",
            \"userPreferences\": {}
        }" \
        --no-buffer)

    # Parse and display the response (simplified for testing)
    echo -e "${GREEN}Assistant Response:${NC}"
    echo "$response" | grep -o '"content":"[^"]*"' | sed 's/"content":"//g' | sed 's/"$//g' | head -5
    echo ""
    echo "---"
    echo ""

    # Small delay to simulate conversation
    sleep 2
}

# Function to test research agent endpoint directly
test_research_agent() {
    echo -e "${BLUE}Testing Research Agent Endpoint...${NC}"

    response=$(curl -s "${BASE_URL}/api/chat/research-agent" \
        -H "Content-Type: application/json")

    if [[ $response == *"UserProfileResearchAgent"* ]]; then
        echo -e "${GREEN}✓ Research Agent is active${NC}"
    else
        echo -e "${RED}✗ Research Agent not responding${NC}"
    fi
    echo ""
}

# Start testing
echo -e "${BLUE}Starting conversational flow test...${NC}"
echo ""

# Test 1: Initial request for personalized agenda (should trigger research agent)
send_message \
    "I want a personalized agenda for the conference with research on my background" \
    "Step 1: Initial Request"

# Test 2: Provide name when asked
send_message \
    "I'm John Smith" \
    "Step 2: Providing Name"

# Test 3: Provide company
send_message \
    "I work at Acme Insurance" \
    "Step 3: Providing Company"

# Test 4: Provide role
send_message \
    "I'm the VP of Innovation" \
    "Step 4: Providing Role"

# Test 5: Confirm research findings (agent should have done research by now)
send_message \
    "Yes, that looks accurate. Please build my agenda" \
    "Step 5: Confirming Research & Requesting Agenda"

# Test 6: Check if agenda was built and offer to save is presented
send_message \
    "Can you show me the agenda you created?" \
    "Step 6: Checking Agenda Status"

# Test 7: Accept save offer (should trigger registration flow)
send_message \
    "Yes, I'd like to save this agenda" \
    "Step 7: Accepting Save Offer"

# Test 8: Provide email for registration
send_message \
    "john.smith@acme.com" \
    "Step 8: Providing Email"

# Test 9: Provide password
send_message \
    "SecurePass123!" \
    "Step 9: Providing Password"

# Test 10: Confirm password
send_message \
    "SecurePass123!" \
    "Step 10: Confirming Password"

# Test 11: Already provided name, so this might be skipped or confirmed
send_message \
    "John Smith" \
    "Step 11: Confirming Name"

# Test 12: Already provided company
send_message \
    "Acme Insurance" \
    "Step 12: Confirming Company"

# Test 13: Already provided role
send_message \
    "VP of Innovation" \
    "Step 13: Confirming Role"

# Test 14: Select interests
send_message \
    "1, 3, 5" \
    "Step 14: Selecting Interests"

echo ""
echo "================================================"
echo -e "${GREEN}Test Flow Complete!${NC}"
echo "================================================"
echo ""
echo "Expected outcomes:"
echo "1. ✓ Research agent should have been triggered"
echo "2. ✓ User information should have been collected"
echo "3. ✓ Research should have been performed (or simulated)"
echo "4. ✓ Smart agenda should have been generated"
echo "5. ✓ Save offer should have been presented"
echo "6. ✓ Registration flow should have started"
echo "7. ✓ Account should have been created"
echo "8. ✓ Agenda should have been saved to profile"
echo ""

# Test the research agent endpoint directly
test_research_agent

echo -e "${BLUE}Check the application logs for detailed flow information${NC}"
echo ""
echo "To run this test:"
echo "1. Make sure the app is running: npm run dev"
echo "2. Run this script: ./test-agent-flow.sh"
echo "3. Check console logs for [Stream API], [ResearchAgent], [Orchestrator] messages"