#!/bin/bash

# Manual test helper for Research Agent flow
# Run this to test individual steps manually

echo "========================================"
echo "Manual Test Helper - Research Agent Flow"
echo "========================================"
echo ""

BASE_URL="${BASE_URL:-http://localhost:3011}"
SESSION_ID="manual_test_$(date +%s)"

echo "Session ID: $SESSION_ID"
echo ""
echo "Test these messages in order:"
echo ""

echo "1. TRIGGER RESEARCH AGENT:"
echo '   "Build me a personalized agenda with research"'
echo ""

echo "2. PROVIDE NAME:"
echo '   "I am Sarah Johnson"'
echo ""

echo "3. PROVIDE COMPANY:"
echo '   "State Farm Insurance"'
echo ""

echo "4. PROVIDE ROLE:"
echo '   "Director of Digital Innovation"'
echo ""

echo "5. CONFIRM RESEARCH:"
echo '   "Yes, build my agenda"'
echo ""

echo "6. SAVE AGENDA:"
echo '   "Yes, save my agenda"'
echo ""

echo "7. REGISTRATION - EMAIL:"
echo '   "sarah.johnson@statefarm.com"'
echo ""

echo "8. REGISTRATION - PASSWORD:"
echo '   "MySecurePass123"'
echo ""

echo "9. CONFIRM PASSWORD:"
echo '   "MySecurePass123"'
echo ""

echo "10. COMPLETE REGISTRATION"
echo ""

echo "----------------------------------------"
echo "Quick curl command to test manually:"
echo ""
echo "curl -X POST ${BASE_URL}/api/chat/stream \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo '    "message": "YOUR_MESSAGE_HERE",'
echo "    \"sessionId\": \"$SESSION_ID\","
echo '    "userPreferences": {}'
echo "  }'"
echo ""
echo "----------------------------------------"
echo ""

# Test if the research agent endpoint is available
echo "Testing Research Agent availability..."
curl -s "${BASE_URL}/api/chat/research-agent" | grep -q "UserProfileResearchAgent" && \
    echo "✓ Research Agent is available" || \
    echo "✗ Research Agent not found"

echo ""
echo "Testing database connection..."
curl -s "${BASE_URL}/api/health" > /dev/null 2>&1 && \
    echo "✓ API is responding" || \
    echo "✗ API not responding (is the server running?)"

echo ""
