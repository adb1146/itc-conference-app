# Testing the Complete Research Agent → Smart Agenda → Registration Flow

## Overview
This document describes how to test the complete conversational flow from guest user to registered user with saved agenda.

## Prerequisites
1. Start the development server:
   ```bash
   npm run dev
   ```

2. Ensure database is running:
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   ```

## Test Flow

### Phase 1: Research Agent Activation

**User Message 1:**
```
"Build me a personalized agenda for the conference"
```

**Expected Response:**
- AI should recognize guest user
- Offer to research background OR
- Ask for basic information to personalize

**Alternative Triggers:**
- "I want a personalized agenda with research"
- "Create my conference schedule"
- "Build me an agenda based on my background"

### Phase 2: Information Collection

The agent should ask for:

**User Message 2 (Name):**
```
"I'm John Smith"
```

**User Message 3 (Company):**
```
"I work at Acme Insurance"
```

**User Message 4 (Role):**
```
"I'm the VP of Innovation"
```

**Expected Behavior:**
- Sequential questions
- Natural conversation flow
- Context preservation

### Phase 3: Research Simulation

**Expected Response After Info Collection:**
```
"Let me research your background to personalize your conference experience..."
```

The agent should:
- Perform mock research (using mock data in development)
- Present findings
- Ask for confirmation

### Phase 4: Agenda Generation

**User Message 5:**
```
"Yes, that looks good. Build my agenda"
```

**Expected Response:**
- Personalized agenda with sessions
- Based on research findings
- Formatted with session details

### Phase 5: Save Offer

**After Agenda Generation:**
The system should automatically offer:
```
🔒 Would you like to save this agenda to your profile?

I can help you create a free account right here in the chat to:
• Save all X selected sessions
• Get reminders before sessions start
• Export to your calendar
• Access from any device

Just say "yes" to save your agenda
```

### Phase 6: In-Chat Registration

**User Message 6:**
```
"Yes, I'd like to save it"
```

**Registration Flow:**

1. **Email Collection:**
   - User: "john.smith@acme.com"

2. **Password Creation:**
   - User: "SecurePass123"

3. **Password Confirmation:**
   - User: "SecurePass123"

4. **Name Confirmation:**
   - Already collected, might skip or confirm

5. **Company Confirmation:**
   - Already collected, might skip or confirm

6. **Role Confirmation:**
   - Already collected, might skip or confirm

7. **Interest Selection:**
   - User: "1, 3, 5" (selecting from numbered list)

### Phase 7: Account Creation & Agenda Save

**Expected Final Response:**
```
✅ Account created successfully!

🎯 I've saved your personalized agenda with X sessions to your profile.

You can now:
• View your saved sessions in the Favorites section
• Export your schedule to your calendar
• Get personalized recommendations
• Access your agenda from any device
```

## Testing with cURL

### Test Complete Flow:
```bash
# Set session ID
SESSION="test_$(date +%s)"

# Step 1: Initial request
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Build me a personalized agenda\",
    \"sessionId\": \"$SESSION\",
    \"userPreferences\": {}
  }"

# Step 2: Provide name
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"I am John Smith\",
    \"sessionId\": \"$SESSION\",
    \"userPreferences\": {}
  }"

# Continue with remaining steps...
```

## Debugging

### Check Logs
Look for these log messages in the console:

1. `[Stream API] Detected research request from guest user`
2. `[Stream API] Continuing research agent conversation`
3. `[ProfileAgent] Starting research for: John Smith`
4. `[Stream API] User wants to save agenda, starting registration`
5. `[Stream API] Registration in progress, handling registration flow`
6. `[RegistrationHandler] Account creation successful`

### Common Issues

1. **Research Agent Not Triggering:**
   - Check if message contains trigger keywords
   - Verify user is not authenticated
   - Check conversation state

2. **Registration Not Starting:**
   - Ensure agenda was generated first
   - Check if pendingAgenda is stored
   - Verify "yes" response is detected

3. **Account Creation Failing:**
   - Check database connection
   - Verify email uniqueness
   - Check password requirements

## Database Verification

After successful flow, verify in database:

```sql
-- Check user was created
SELECT * FROM users WHERE email = 'john.smith@acme.com';

-- Check favorites were saved
SELECT COUNT(*) FROM favorites
WHERE user_id = (SELECT id FROM users WHERE email = 'john.smith@acme.com');

-- Check user metadata
SELECT metadata FROM users WHERE email = 'john.smith@acme.com';
```

## Expected Data Flow

1. **ConversationState** tracks:
   - researchAgentActive
   - pendingAgenda
   - registrationInProgress
   - registrationStep

2. **Session Storage** maintains:
   - User responses
   - Generated agenda
   - Registration data (temporarily)

3. **Database** stores:
   - User account
   - Favorite sessions
   - Agenda metadata

## Success Criteria

✅ Guest user can trigger research agent
✅ Information collected conversationally
✅ Research performed (or simulated)
✅ Agenda generated based on profile
✅ Save offer presented
✅ Registration completed in chat
✅ Account created successfully
✅ Agenda saved to favorites
✅ User can access saved sessions

## Notes

- In development, research uses mock data
- Real web search requires API keys
- Registration is atomic - all or nothing
- Agenda persists for 24 hours if not saved
- Session continuity maintained throughout