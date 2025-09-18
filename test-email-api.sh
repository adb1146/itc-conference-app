#!/bin/bash

echo "Testing Schedule Email API"
echo "=========================="
echo ""

# Test the schedule email endpoint
echo "Sending request to email schedule endpoint..."
curl -X POST http://localhost:3012/api/schedule/email \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat .test-cookie 2>/dev/null || echo '')" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq . 2>/dev/null || cat

echo ""
echo "Test complete!"
echo ""
echo "Note: You need to be logged in for this to work."
echo "The email will be sent to your registered email address."