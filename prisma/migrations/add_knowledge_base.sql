-- Create a separate knowledge base table for PS Advisory and other non-session content
CREATE TABLE IF NOT EXISTS "KnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL, -- 'ps_advisory', 'conference_info', etc.
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "keywords" TEXT[],
    "embedding" DOUBLE PRECISION[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for category searches
CREATE INDEX IF NOT EXISTS "KnowledgeBase_category_idx" ON "KnowledgeBase"("category");

-- Create index for keyword searches
CREATE INDEX IF NOT EXISTS "KnowledgeBase_keywords_idx" ON "KnowledgeBase" USING GIN("keywords");

-- Insert PS Advisory facts into knowledge base
INSERT INTO "KnowledgeBase" ("id", "category", "title", "content", "keywords") VALUES
('ps-advisory-facts-1', 'ps_advisory', 'PS Advisory Company Facts',
 'PS Advisory is an insurance technology consulting firm founded by Andrew Bartels (NOT Nancy Paul). The company specializes in Salesforce solutions for insurance organizations. PS Advisory built this ITC Vegas conference app as a technology demonstration. IMPORTANT: PS Advisory does NOT have a booth at ITC Vegas and team members are NOT speaking at conference sessions.',
 ARRAY['PS Advisory', 'Andrew Bartels founder', 'NOT Nancy Paul founder', 'no booth', 'not speaking']),

('ps-advisory-facts-2', 'ps_advisory', 'Nancy Paul - Senior Delivery Manager',
 'Nancy Paul is the Senior Delivery Manager at PS Advisory (NOT the founder, NOT the CEO). She has 17 years of project management experience. Nancy is NOT speaking at ITC Vegas 2025. She is NOT presenting at any panels. PS Advisory does NOT have a booth at the conference.',
 ARRAY['Nancy Paul', 'Senior Delivery Manager', 'NOT founder', 'NOT CEO', 'NOT speaking']),

('ps-advisory-facts-3', 'ps_advisory', 'Andrew Bartels - Founder and CEO',
 'Andrew Bartels is the Founder and CEO of PS Advisory. He founded the company to provide Salesforce expertise to insurance organizations. Andrew is the actual founder, not Nancy Paul.',
 ARRAY['Andrew Bartels', 'founder', 'CEO', 'PS Advisory founder']),

('ps-advisory-facts-4', 'ps_advisory', 'Not Affiliated with PS Advisory',
 'The following people are NOT affiliated with PS Advisory: Agim Emruli (works for Flowable, not PS Advisory), Clive Thompson (not with PS Advisory). Conference speakers are NOT PS Advisory employees unless explicitly stated.',
 ARRAY['Agim Emruli not PS Advisory', 'not affiliated', 'Flowable']);