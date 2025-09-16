#!/bin/bash

# Test PS Advisory integration
echo "Testing PS Advisory Chat Integration"
echo "====================================="

# Test 1: General PS Advisory query
echo -e "\n1. Testing general PS Advisory query..."
curl -s -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about PS Advisory", "sessionId": "test-ps-1"}' \
  2>/dev/null | grep -o '"content":"[^"]*' | head -1

# Test 2: Four Quadrant Method
echo -e "\n2. Testing Four Quadrant Method query..."
curl -s -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the Four Quadrant Method?", "sessionId": "test-ps-2"}' \
  2>/dev/null | grep -o '"content":"[^"]*' | head -1

# Test 3: Workers Compensation
echo -e "\n3. Testing Workers Compensation query..."
curl -s -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "How does PS Advisory help with workers compensation?", "sessionId": "test-ps-3"}' \
  2>/dev/null | grep -o '"content":"[^"]*' | head -1

# Test 4: Life Insurance
echo -e "\n4. Testing Life Insurance query..."
curl -s -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "What life insurance solutions does PS Advisory offer?", "sessionId": "test-ps-4"}' \
  2>/dev/null | grep -o '"content":"[^"]*' | head -1

# Test 5: Nancy Paul
echo -e "\n5. Testing Nancy Paul query..."
curl -s -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Who is Nancy Paul?", "sessionId": "test-ps-5"}' \
  2>/dev/null | grep -o '"content":"[^"]*' | head -1

echo -e "\n\nTest complete!"