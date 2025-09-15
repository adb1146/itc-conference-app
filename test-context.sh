#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

API_URL="http://localhost:3011/api/chat/stream"

echo -e "${CYAN}🚀 Testing Conversation Context System${NC}\n"

# Function to send a message and capture session ID
send_message() {
    local message="$1"
    local session_id="$2"

    echo -e "${BLUE}📤 Sending:${NC} \"$message\""

    # Build JSON payload
    if [ -z "$session_id" ]; then
        payload="{\"message\":\"$message\",\"userPreferences\":{}}"
    else
        payload="{\"message\":\"$message\",\"sessionId\":\"$session_id\",\"userPreferences\":{}}"
    fi

    # Send request and capture response
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null | head -20)

    # Extract session ID from response if present
    if echo "$response" | grep -q "sessionId"; then
        new_session_id=$(echo "$response" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)
        if [ ! -z "$new_session_id" ]; then
            echo -e "${GREEN}🔑 Session ID:${NC} $new_session_id"
            echo "$new_session_id"
        fi
    fi

    echo -e "${GREEN}📥 Response received${NC}"
    echo "---"
    sleep 2
}

echo -e "${YELLOW}Test 1: Agenda Building Flow${NC}"
echo "Testing if preferences are remembered across messages"
echo ""

SESSION_ID=""

# Message 1: Request agenda
result=$(send_message "Build me an agenda" "")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 2: Provide preferences
result=$(send_message "I am interested in AI and cybersecurity, I am a product manager attending all 3 days" "$SESSION_ID")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 3: Follow-up question (should remember interests)
result=$(send_message "Can you show me more sessions in my areas of interest?" "$SESSION_ID")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

echo -e "${GREEN}✅ Test 1 Complete${NC}\n"
sleep 3

echo -e "${YELLOW}Test 2: Session Context Flow${NC}"
echo "Testing if session details are maintained"
echo ""

SESSION_ID=""

# Message 1: Ask about sessions
result=$(send_message "What AI sessions are on Tuesday?" "")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 2: Ask for details (should remember we're talking about AI sessions on Tuesday)
result=$(send_message "Tell me more about the first one you mentioned" "$SESSION_ID")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 3: Ask about speakers (should know which session we're discussing)
result=$(send_message "Who are the speakers?" "$SESSION_ID")

echo -e "${GREEN}✅ Test 2 Complete${NC}\n"
sleep 3

echo -e "${YELLOW}Test 3: Complex Multi-turn Conversation${NC}"
echo "Testing role and goal retention"
echo ""

SESSION_ID=""

# Message 1: Establish role
result=$(send_message "I am a CTO at an insurance company" "")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 2: State goal
result=$(send_message "We are looking to implement AI solutions for claims processing" "$SESSION_ID")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 3: Ask for recommendations (should consider role and goal)
result=$(send_message "What sessions would be most relevant for me?" "$SESSION_ID")
if [ ! -z "$result" ]; then
    SESSION_ID="$result"
fi

# Message 4: Follow-up (should remember everything)
result=$(send_message "Based on my role and goals, which keynotes should I prioritize?" "$SESSION_ID")

echo -e "${GREEN}✅ Test 3 Complete${NC}\n"

echo -e "${CYAN}🎉 All tests completed!${NC}"
echo ""
echo "Check the server logs for conversation context being used."
echo "Look for:"
echo "  - Session IDs being maintained"
echo "  - Conversation context in prompts"
echo "  - No duplicate questions about already-shared information"