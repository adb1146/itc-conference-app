#!/bin/bash

echo "Testing Smart Agenda API..."
echo "================================"

# Test the agenda builder endpoint
echo -e "\n1. Testing agenda generation:"
curl -s http://localhost:3011/api/tools/agenda-builder \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: $(curl -s http://localhost:3011/api/auth/session | grep -o 'next-auth[^;]*')" \
  -d '{"options": {}}' | jq '.agenda.days[0].schedule[0]'

echo -e "\n2. Testing favorites API:"
curl -s http://localhost:3011/api/favorites \
  -H "Cookie: $(curl -s http://localhost:3011/api/auth/session | grep -o 'next-auth[^;]*')" | jq '.'

echo -e "\nDone!"