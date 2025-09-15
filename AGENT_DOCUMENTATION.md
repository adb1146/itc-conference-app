# ITC Conference App - Complete Agent Documentation

## Table of Contents
1. [Agent Orchestrator](#1-agent-orchestrator)
2. [User Profile Research Agent](#2-user-profile-research-agent)
3. [Profile Inference Module](#3-profile-inference-module)
4. [Web Search Agent](#4-web-search-agent)
5. [Smart Agenda Builder](#5-smart-agenda-builder)
6. [Local Recommendations Agent](#6-local-recommendations-agent)
7. [In-Chat Registration Handler](#7-in-chat-registration-handler)

---

## 1. Agent Orchestrator

### Purpose
Master coordinator that manages the entire user research journey from information collection through agenda building.

### Location
`/lib/agents/orchestrator.ts`

### How It Works - Step by Step

1. **Session Initialization**
   - Creates or retrieves conversation state for the session
   - Stores session ID for context preservation

2. **Message Processing**
   - Receives user message
   - Calls AI extraction to understand user input
   - Merges extracted info with existing conversation state

3. **Phase Management**
   - **Phase 1: Collecting Info** - Gathers name, company, title
   - **Phase 2: Researching** - Triggers web research
   - **Phase 3: Confirming Profile** - Shows findings to user
   - **Phase 4: Building Agenda** - Creates personalized schedule
   - **Phase 5: Complete** - Offers to save or adjust

4. **Information Extraction (AI-Powered)**
   - Sends message to Claude for intelligent extraction
   - Falls back to regex patterns if AI fails
   - Maintains context across conversation

### AI Prompt Used

```javascript
// Model: Claude 3.5 Sonnet
// Temperature: 0
// Max Tokens: 200

`Extract the person's name, company, and job title/role from this message.
Return ONLY a JSON object with keys "name", "company", and "title".
If any information is not mentioned, use null for that field.

Message: "${message}"

Previous context from conversation:
- Name: ${previousName || 'not yet provided'}
- Company: ${previousCompany || 'not yet provided'}
- Title: ${previousTitle || 'not yet provided'}

Examples:
"I'm Nancy Paul from PS Advisory" → {"name": "Nancy Paul", "company": "PS Advisory", "title": null}
"I work at a major insurance company" → {"name": null, "company": "a major insurance company", "title": null}
"I am the Managing Partner" → {"name": null, "company": null, "title": "Managing Partner"}

Return ONLY the JSON object, no other text.`
```

### Test Procedure

```bash
# Step 1: Start the conversation
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Build me a personalized agenda","sessionId":"test_orchestrator","userPreferences":{}}'

# Expected: "I'd love to create a personalized agenda for you! I can research your background..."

# Step 2: Provide name
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"I am John Smith","sessionId":"test_orchestrator","userPreferences":{}}'

# Expected: "Thanks! I still need your company and role/title..."

# Step 3: Provide company
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"I work at State Farm Insurance","sessionId":"test_orchestrator","userPreferences":{}}'

# Expected: "Thanks! I still need your role/title..."

# Step 4: Provide title
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"I am the CTO","sessionId":"test_orchestrator","userPreferences":{}}'

# Expected: "Perfect! I have your information... Let me research your background..."

# Step 5: Wait 10 seconds, then check results
sleep 10
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"What did you find?","sessionId":"test_orchestrator","userPreferences":{}}'

# Expected: "Research Complete! Based on my research, here's what I found..."
```

---

## 2. User Profile Research Agent

### Purpose
Performs comprehensive web research to understand user's professional background and generate an enriched profile.

### Location
`/lib/agents/user-profile-researcher.ts`

### How It Works - Step by Step

1. **Query Generation**
   - Creates 2-3 targeted search queries
   - Combines name, company, and title strategically
   - Focuses on LinkedIn, company initiatives, and industry trends

2. **Parallel Search Execution**
   - Runs all searches simultaneously (not sequential)
   - 5-second timeout per search
   - Uses Promise.allSettled for resilience

3. **Result Processing**
   - Extracts relevant information from search results
   - Identifies LinkedIn profiles, company focus, expertise
   - Builds research context object

4. **Profile Inference**
   - Sends research to inference module
   - Gets structured interests and goals
   - Generates recommendations

5. **Caching**
   - Caches results for 5 minutes
   - Avoids redundant API calls

### Search Queries Generated

```javascript
// For user "Nancy Paul, Managing Partner at PS Advisory"
[
  '"Nancy Paul" "PS Advisory" "Managing Partner" LinkedIn insurance profile',
  'PS Advisory insurance technology "Managing Partner" digital transformation initiatives',
  'Managing Partner insurance industry trends 2025 technology'
]
```

### Test Procedure

```javascript
// Direct test of research agent
import { UserProfileResearchAgent } from './lib/agents/user-profile-researcher';

const agent = new UserProfileResearchAgent({
  inferenceDepth: 'detailed',
  includeLinkedIn: true,
  includeCompanyNews: true
});

const profile = await agent.researchUser({
  name: 'Andrew Bartels',
  company: 'PS Advisory',
  title: 'CEO'
});

console.log('Research Results:', profile);
// Expected: Enriched profile with interests, goals, recommendations
```

---

## 3. Profile Inference Module

### Purpose
Uses AI to analyze research results and infer user characteristics, interests, and conference goals.

### Location
`/lib/agents/research/profile-inference.ts`

### How It Works - Step by Step

1. **Input Preparation**
   - Receives user info and research context
   - Formats data for AI analysis

2. **AI Inference**
   - Sends to Claude Haiku (fast model)
   - Requests structured JSON response
   - Temperature 0.3 for consistency

3. **Response Parsing**
   - Extracts JSON from AI response
   - Validates required fields
   - Falls back to rule-based inference if needed

4. **Output Generation**
   - Returns structured profile with:
     - Interests (5-8 items)
     - Experience level
     - Focus areas
     - Conference goals
     - Company initiatives

### AI Prompt Used

```javascript
// Model: Claude 3 Haiku
// Temperature: 0.3
// Max Tokens: 1000

`You are an expert at analyzing professional profiles for conference personalization.

Based on the following information about a user, infer their professional characteristics:

USER INFORMATION:
- Name: ${userInfo.name}
- Company: ${userInfo.company}
- Title: ${userInfo.title}

RESEARCH FINDINGS:
LinkedIn: ${researchContext.linkedInSummary}
Company Focus: ${researchContext.companyFocus}
Background: ${researchContext.professionalBackground}
Expertise: ${researchContext.expertise}
Projects: ${researchContext.recentProjects}

Please infer the following characteristics. Be specific and relevant to the insurance industry conference context.
Return your response in JSON format with these exact fields:

{
  "interests": ["5-8 specific technology/business interests relevant to insurance"],
  "experienceLevel": "Entry|Mid|Senior|Executive",
  "focusAreas": ["3-5 specific areas they likely focus on"],
  "goals": ["3-5 likely conference goals"],
  "companyInitiatives": ["2-4 initiatives their company is likely pursuing"],
  "technicalProficiency": "Basic|Intermediate|Advanced",
  "networkingPreferences": ["2-3 types of people they'd want to meet"],
  "learningStyle": "Hands-on|Strategic|Technical|Mixed"
}

Focus on:
- Insurance industry relevance
- Current technology trends (AI, automation, cyber, embedded insurance)
- Role-appropriate interests
- Company-aligned initiatives`
```

### Test Procedure

```bash
# Test inference with mock research data
curl -X POST http://localhost:3011/api/test/inference \
  -H "Content-Type: application/json" \
  -d '{
    "userInfo": {
      "name": "Jane Doe",
      "company": "Progressive Insurance",
      "title": "VP of Innovation"
    },
    "researchContext": {
      "linkedInSummary": "15+ years in insurance technology...",
      "companyFocus": "Digital transformation and customer experience..."
    }
  }'

# Expected: JSON with inferred interests, goals, etc.
```

---

## 4. Web Search Agent

### Purpose
Interfaces with Anthropic's web search tool to find real-time information about users and companies.

### Location
`/app/api/web-search/route.ts`

### How It Works - Step by Step

1. **Request Validation**
   - Checks for query parameter
   - Validates API key availability

2. **Search Configuration**
   - Uses Anthropic's web_search_20250305 tool
   - Sets max_uses to 3
   - Configures domain filters if provided

3. **API Call**
   - Sends to Claude 3.5 Sonnet
   - Includes web search tool
   - Auto tool choice

4. **Response Processing**
   - Extracts content from Claude's response
   - Identifies sources/URLs
   - Cleans content before returning

### AI Prompt Used

```javascript
// Model: Claude 3.5 Sonnet
// Tool: web_search_20250305
// Max Tokens: 1500

`Please search the web for the following information and provide a comprehensive summary:

Query: ${query}
Context: ${context}

Please provide:
1. A comprehensive summary of findings
2. Key facts and details
3. Relevant URLs if found
4. Focus on professional/business information for people and company overviews for organizations`
```

### Test Procedure

```bash
# Test web search directly
curl -X POST http://localhost:3011/api/web-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Nancy Paul PS Advisory insurance technology",
    "context": "Professional research for conference personalization",
    "maxResults": 5
  }'

# Expected: Summary of findings about Nancy Paul and PS Advisory
```

---

## 5. Smart Agenda Builder

### Purpose
Creates intelligent, personalized conference schedules using AI reasoning and optimization.

### Location
`/lib/tools/schedule/smart-agenda-builder.ts`
`/lib/tools/schedule/ai-reasoning-engine.ts`

### How It Works - Step by Step

1. **Profile Analysis**
   - Evaluates user's interests and goals
   - Identifies knowledge gaps
   - Considers experience level

2. **Session Scoring**
   - Rates each session 0-100 for relevance
   - Considers speaker quality
   - Evaluates networking potential

3. **Schedule Optimization**
   - Balances cognitive load
   - Manages energy levels
   - Minimizes venue walking

4. **Conflict Resolution**
   - Handles time overlaps
   - Prioritizes based on user preferences
   - Suggests alternatives

5. **Final Assembly**
   - Creates day-by-day schedule
   - Adds breaks and meals
   - Includes reasoning for choices

### AI Reasoning Prompt (Abbreviated)

```javascript
// Model: Claude (varies)
// Temperature: 0.2-0.7

`You are an expert conference schedule optimizer...

THINKING FRAMEWORK FOR AGENDA BUILDING:

1. PROFILE ANALYSIS:
   - Analyze explicit goals and implicit needs
   - Identify knowledge gaps based on role
   - Consider career trajectory

2. SESSION EVALUATION:
   - Content relevance score (0-100)
   - Speaker quality and reputation
   - Networking potential

3. SCHEDULE OPTIMIZATION:
   - Cognitive load distribution
   - Energy management
   - Topic progression
   - Venue logistics

4. PRIORITY SYSTEM:
   Priority 100: User's explicit favorites
   Priority 85: Perfect profile matches
   Priority 70: Strong alignment
   Priority 50: Good fit
   Priority 30: Optional

USER PROFILE:
${userProfile}

AVAILABLE SESSIONS:
${sessions}

Build an optimal schedule for Day ${dayNumber}.`
```

### Test Procedure

```bash
# Test agenda building for authenticated user
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Build my personalized agenda",
    "sessionId": "test_agenda",
    "userPreferences": {
      "email": "test@example.com",
      "interests": ["AI", "Cybersecurity"],
      "role": "CTO"
    }
  }'

# Expected: Complete 3-day agenda with sessions, reasoning, and links
```

---

## 6. Local Recommendations Agent

### Purpose
Provides instant recommendations for Mandalay Bay restaurants, bars, and activities.

### Location
`/lib/agents/local-recommendations-agent.ts`

### How It Works - Step by Step

1. **Query Detection**
   - Identifies keywords (restaurant, bar, food, etc.)
   - Determines recommendation type

2. **Data Retrieval**
   - Returns cached venue data
   - No API calls needed
   - Instant response

3. **Formatting**
   - Structures response with emojis
   - Includes walking times
   - Adds price ranges

4. **Response Generation**
   - Returns markdown-formatted list
   - Includes tips and warnings

### No AI Prompt - Uses Static Data

```javascript
// Example cached data structure
{
  restaurants: [
    {
      name: "Aureole",
      type: "Fine Dining",
      price: "$$$$",
      location: "Mandalay Bay",
      walkTime: "5 min",
      description: "Wine tower, contemporary American"
    }
  ],
  bars: [
    {
      name: "Minus5 Ice Bar",
      type: "Experience Bar",
      price: "$$$",
      location: "Mandalay Bay Shoppes",
      walkTime: "3 min"
    }
  ]
}
```

### Test Procedure

```bash
# Test restaurant recommendations
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What restaurants are nearby?",
    "sessionId": "test_local",
    "userPreferences": {}
  }'

# Expected: List of Mandalay Bay restaurants with details

# Test bar recommendations
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Where can I get a drink?",
    "sessionId": "test_local",
    "userPreferences": {}
  }'

# Expected: List of bars and lounges with walking times
```

---

## 7. In-Chat Registration Handler

### Purpose
Manages the conversational registration flow within the chat interface.

### Location
`/lib/chat/registration-handler.ts`

### How It Works - Step by Step

1. **Offer Stage**
   - Detects when user has agenda to save
   - Offers registration with benefits

2. **Email Collection**
   - Validates email format
   - Checks for existing account

3. **Password Creation**
   - Enforces minimum 8 characters
   - Stores securely

4. **Name Collection**
   - Gets user's full name
   - Optional but recommended

5. **Account Creation**
   - Creates database record
   - Saves pending agenda
   - Returns success confirmation

### Conversation Flow

```typescript
// State machine for registration
type RegistrationState =
  | 'offer_save'      // Offer to save agenda
  | 'collect_email'   // Get email address
  | 'collect_password'// Get password
  | 'collect_name'    // Get full name
  | 'complete';       // Registration done
```

### Test Procedure

```bash
# Step 1: Generate an agenda first
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want sessions on AI and cybersecurity, attending all 3 days",
    "sessionId": "test_registration",
    "userPreferences": {}
  }'

# Wait for agenda generation...

# Step 2: Respond to save offer
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "yes, save my agenda",
    "sessionId": "test_registration",
    "userPreferences": {}
  }'

# Expected: "Great! Let's create your account. What's your email address?"

# Step 3: Provide email
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "john@example.com",
    "sessionId": "test_registration",
    "userPreferences": {}
  }'

# Expected: "Perfect! Now create a password (minimum 8 characters):"

# Step 4: Provide password
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "MySecurePass123",
    "sessionId": "test_registration",
    "userPreferences": {}
  }'

# Expected: "Almost done! What's your full name?"

# Step 5: Provide name
curl -X POST http://localhost:3011/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "John Smith",
    "sessionId": "test_registration",
    "userPreferences": {}
  }'

# Expected: "🎉 Account created successfully! Your agenda has been saved..."
```

---

## Complete Integration Test

### Full Research + Agenda Flow

```bash
#!/bin/bash
# Save as test-full-flow.sh

SESSION_ID="full_test_$(date +%s)"
BASE_URL="http://localhost:3011"

echo "=== ITC Conference App - Full Agent Test ==="
echo "Session ID: $SESSION_ID"
echo ""

# Step 1: Initial request
echo "Step 1: Starting personalized agenda request..."
curl -s -X POST "$BASE_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Build me a personalized agenda\",\"sessionId\":\"$SESSION_ID\",\"userPreferences\":{}}" | \
  grep -o '"content":"[^"]*"' | head -1

sleep 2

# Step 2: Provide complete information
echo -e "\n\nStep 2: Providing user information..."
curl -s -X POST "$BASE_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"I'm Nancy Paul, Managing Partner at PS Advisory\",\"sessionId\":\"$SESSION_ID\",\"userPreferences\":{}}" | \
  grep -o '"content":"[^"]*"' | head -1

sleep 2

# Step 3: Confirm company
echo -e "\n\nStep 3: Confirming company..."
curl -s -X POST "$BASE_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Yes, PS Advisory is correct\",\"sessionId\":\"$SESSION_ID\",\"userPreferences\":{}}" | \
  grep -o '"content":"[^"]*"' | head -1

sleep 2

# Step 4: Provide role if needed
echo -e "\n\nStep 4: Confirming role..."
curl -s -X POST "$BASE_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Managing Partner\",\"sessionId\":\"$SESSION_ID\",\"userPreferences\":{}}" | \
  grep -o '"content":"[^"]*"' | head -1

# Wait for research
echo -e "\n\nWaiting for research to complete (15 seconds)..."
sleep 15

# Step 5: Check research results
echo -e "\n\nStep 5: Checking research results..."
curl -s -X POST "$BASE_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"What did you find about me?\",\"sessionId\":\"$SESSION_ID\",\"userPreferences\":{}}" | \
  grep -o '"content":"[^"]*"' | head -3

sleep 2

# Step 6: Build agenda
echo -e "\n\nStep 6: Building agenda..."
curl -s -X POST "$BASE_URL/api/chat/stream" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Yes, build my agenda based on that\",\"sessionId\":\"$SESSION_ID\",\"userPreferences\":{}}" | \
  grep -o '"content":"[^"]*"' | head -3

echo -e "\n\n=== Test Complete ==="
echo "Check the browser at $BASE_URL/chat for the full experience"
```

---

## Performance Metrics

| Agent | Response Time | API Calls | Caching |
|-------|--------------|-----------|---------|
| Orchestrator | <100ms | 1 (extraction) | Session state |
| Research Agent | ~7 seconds | 2-3 (parallel) | 5 minutes |
| Profile Inference | ~1 second | 1 | No |
| Web Search | 2-5 seconds | 1 | Via research agent |
| Smart Agenda | 2-5 seconds | 1-2 | No |
| Local Recommendations | <50ms | 0 | Static data |
| Registration Handler | <100ms | 0 | Session state |

---

## Error Handling

All agents include fallback mechanisms:

1. **Orchestrator**: Falls back to regex extraction if AI fails
2. **Research Agent**: Returns partial results if some searches fail
3. **Profile Inference**: Uses rule-based inference if AI fails
4. **Web Search**: Returns mock data in development mode
5. **Agenda Builder**: Falls back to basic algorithm if AI fails
6. **Local Recommendations**: Always returns data (cached)
7. **Registration Handler**: Validates at each step, allows retry

---

## Recent Optimizations

### Speed Improvements
- Parallel search execution (6x faster)
- 5-second timeout per search
- Result caching (5-minute TTL)
- Reduced searches from 6-8 to 2-3

### Intelligence Improvements
- AI-powered extraction replacing regex
- Anthropic web search integration
- Context preservation across conversations
- Singleton pattern for state management

### User Experience
- In-chat registration flow
- Instant local recommendations
- Progressive disclosure of information
- Clear phase indicators

---

## Environment Variables Required

```bash
# Required
ANTHROPIC_API_KEY=your-key-here
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret

# Optional (for enhanced search)
GOOGLE_SEARCH_API_KEY=your-key
GOOGLE_SEARCH_ENGINE_ID=your-id
OPENAI_API_KEY=your-key  # For embeddings
PINECONE_API_KEY=your-key  # For vector search
```

---

## Debugging Tips

1. **Check Logs**: Look for `[AgentName]` prefixed messages
2. **Session State**: Use `getConversation(sessionId)` to inspect state
3. **API Responses**: Check `/tmp/server.log` for full API responses
4. **Test Scripts**: Use provided bash scripts for isolated testing
5. **Browser Tools**: Network tab shows streaming responses

---

## Contact & Support

For questions about the agent system:
- Technical Lead: Development Team
- Documentation: This file
- Issues: GitHub Issues
- Logs: Check console for `[Agent]` prefixed messages

Last Updated: January 2025
Version: 2.0.0