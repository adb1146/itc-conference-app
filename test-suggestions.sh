#!/bin/bash

# Enhanced Chat Suggestion Test Script
# Tests context retention and suggestion generation

echo "🧪 Testing Enhanced Chat Suggestions"
echo "===================================="

# Base URL
BASE_URL="http://localhost:3011/api/chat"

# Test 1: Initial query (no context)
echo -e "\n📝 Test 1: Initial Query (No Context)"
echo "Question: 'Where are the best happy hours?'"
echo "----------------------------------------"

RESPONSE1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where are the best happy hours?",
    "conversationHistory": [],
    "userPreferences": {
      "name": "Test User",
      "interests": ["Networking", "AI"]
    }
  }')

echo "$RESPONSE1" | jq -r '.response' | head -20
echo -e "\n💡 Checking for suggestions..."
echo "$RESPONSE1" | jq -r '.response' | grep "•" | head -5

# Test 2: Follow-up with context
echo -e "\n\n📝 Test 2: Follow-up Query (With Context)"
echo "Previous: 'Where are the best happy hours?'"
echo "Current: 'ok on Day 1'"
echo "----------------------------------------"

RESPONSE2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "message": "ok on Day 1",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Where are the best happy hours?"
      },
      {
        "role": "assistant",
        "content": "The conference features several great networking happy hours across all three days..."
      }
    ],
    "userPreferences": {
      "name": "Test User",
      "interests": ["Networking", "AI"]
    }
  }')

echo "$RESPONSE2" | jq -r '.response' | head -20
echo -e "\n✅ Context Check: Should mention Day 1 happy hours specifically"

# Test 3: Multiple turns
echo -e "\n\n📝 Test 3: Multi-turn Conversation"
echo "Testing suggestion evolution over multiple turns"
echo "----------------------------------------"

RESPONSE3=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What about AI sessions?",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Where are the best happy hours?"
      },
      {
        "role": "assistant",
        "content": "The conference features several great networking happy hours..."
      },
      {
        "role": "user",
        "content": "ok on Day 1"
      },
      {
        "role": "assistant",
        "content": "On Day 1, the main happy hour event is the Opening Reception..."
      }
    ],
    "userPreferences": {
      "name": "Test User",
      "interests": ["Networking", "AI"]
    }
  }')

echo "$RESPONSE3" | jq -r '.response' | head -20
echo -e "\n💡 Suggestions should now be AI-focused:"
echo "$RESPONSE3" | jq -r '.response' | grep "•" | head -5

echo -e "\n\n✨ Test Complete!"
echo "Check if:"
echo "1. ✓ Suggestions are contextually relevant"
echo "2. ✓ Follow-ups maintain conversation context"
echo "3. ✓ Suggestions evolve with the conversation"