/**
 * PS Advisory Context and Information
 * Comprehensive information about PSAdvisory.com and contextual meeting suggestions
 *
 * PS Advisory is a boutique insurance technology consulting firm specializing in:
 * - Salesforce implementations for insurance carriers and agencies
 * - Digital transformation strategies for the insurance industry
 * - AI and automation solutions for underwriting and claims
 * - CRM optimization and data analytics
 * - Custom insurtech solution development
 *
 * Website: https://psadvisory.com
 * Founded by: Andrew Bartels, insurance technology expert with decades of experience
 * Headquarters: Based in the US, serving insurance organizations globally
 *
 * Core Services:
 * 1. Salesforce Insurance Cloud Implementation
 * 2. Digital Agent/Broker Portals
 * 3. Underwriting Automation
 * 4. Claims Processing Optimization
 * 5. Data Analytics and BI Solutions
 * 6. API Integration and Middleware
 * 7. Legacy System Modernization
 * 8. AI/ML Model Development for Insurance
 */

interface MeetingSuggestionContext {
  shouldSuggest: boolean;
  message?: string;
  urgency: 'subtle' | 'moderate' | 'none';
}

// PS Advisory expertise areas for contextual matching
export const PS_ADVISORY_EXPERTISE = {
  technologies: [
    'salesforce', 'insurance cloud', 'financial services cloud',
    'mulesoft', 'tableau', 'einstein analytics', 'copado',
    'databricks', 'snowflake', 'aws', 'azure', 'google cloud'
  ],
  industries: [
    'property & casualty', 'life insurance', 'health insurance',
    'reinsurance', 'mga', 'mgo', 'insurance brokers', 'agents',
    'workers compensation', 'workers comp', 'work comp', 'wc insurance'
  ],
  solutions: [
    'policy administration', 'claims management', 'underwriting automation',
    'agent portals', 'customer portals', 'quote and bind', 'renewal processing',
    'commission management', 'producer management', 'regulatory compliance',
    'fnol', 'first notice of loss', 'medical bill review', 'return to work',
    'injured worker', 'claim triage', 'froi', 'sroi', 'ncci reporting',
    'subrogation', 'litigation management', 'provider network', 'medical management'
  ],
  methodologies: [
    'agile', 'safe', 'devops', 'ci/cd', 'test automation',
    'change management', 'user adoption', 'training',
    'four quadrant method', 'friction gap analysis'
  ],
  specialties: [
    'workers compensation transformation', 'comp claims automation',
    'multi-state compliance', 'medical cost containment',
    'return-to-work programs', 'fraud detection', 'predictive analytics'
  ]
};

// Track suggestion frequency per session
const sessionSuggestionCount = new Map<string, { count: number; lastSuggested: Date }>();

/**
 * Determine if we should suggest a meeting based on conversation context
 */
export function shouldSuggestMeeting(
  query: string,
  responseContent: string,
  sessionId: string,
  messageCount: number
): MeetingSuggestionContext {
  const lowerQuery = query.toLowerCase();
  const lowerResponse = responseContent.toLowerCase();

  // Get session suggestion history
  const sessionHistory = sessionSuggestionCount.get(sessionId) || { count: 0, lastSuggested: new Date(0) };
  const timeSinceLastSuggestion = Date.now() - sessionHistory.lastSuggested.getTime();
  const minutesSinceLastSuggestion = timeSinceLastSuggestion / (1000 * 60);

  // Don't suggest too frequently - wait at least 10 minutes between suggestions
  if (minutesSinceLastSuggestion < 10 && sessionHistory.count > 0) {
    return { shouldSuggest: false, urgency: 'none' };
  }

  // Don't suggest more than 3 times per session
  if (sessionHistory.count >= 3) {
    return { shouldSuggest: false, urgency: 'none' };
  }

  // Keywords that indicate high interest in implementation/strategy
  const highInterestKeywords = [
    'implement', 'strategy', 'roadmap', 'integration', 'salesforce',
    'project', 'initiative', 'planning', 'deployment', 'solution',
    'budget', 'timeline', 'resources', 'team', 'consulting',
    'how can we', 'how do we', 'what would it take', 'interested in',
    'our company', 'our organization', 'we need', 'we want'
  ];

  // Keywords that indicate general interest/exploration
  const moderateInterestKeywords = [
    'ai', 'automation', 'efficiency', 'optimization', 'innovation',
    'digital transformation', 'modernization', 'best practices',
    'recommendations', 'advice', 'guidance', 'help', 'assist'
  ];

  // Check for high interest indicators
  const hasHighInterest = highInterestKeywords.some(keyword =>
    lowerQuery.includes(keyword) || lowerResponse.includes(keyword)
  );

  // Check for moderate interest indicators
  const hasModerateInterest = moderateInterestKeywords.some(keyword =>
    lowerQuery.includes(keyword) || lowerResponse.includes(keyword)
  );

  // Contextual rules for suggestions

  // Rule 1: After discussing specific implementation details
  if (hasHighInterest && messageCount > 3) {
    return {
      shouldSuggest: true,
      urgency: 'moderate',
      message: "If you'd like to explore how PS Advisory can help bring these ideas to life for your organization, our team would be happy to discuss your specific needs and objectives."
    };
  }

  // Rule 2: After providing strategic recommendations
  if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest') || lowerResponse.includes('consider')) {
    if (messageCount > 5 && hasModerateInterest) {
      return {
        shouldSuggest: true,
        urgency: 'subtle',
        message: "For a deeper dive into implementing these strategies within your organization's unique context, consider connecting with the PS Advisory team."
      };
    }
  }

  // Rule 3: When discussing Salesforce or CRM integration
  if ((lowerQuery.includes('salesforce') || lowerQuery.includes('crm')) && messageCount > 2) {
    return {
      shouldSuggest: true,
      urgency: 'moderate',
      message: "PS Advisory specializes in Salesforce implementations for insurance organizations. Our team can help you navigate the complexities of CRM integration and maximize your technology investment."
    };
  }

  // Rule 4: After extended conversation showing engagement (subtle suggestion)
  if (messageCount > 8 && sessionHistory.count === 0) {
    return {
      shouldSuggest: true,
      urgency: 'subtle',
      message: "By the way, if you're considering any technology initiatives or digital transformation projects, PS Advisory offers complimentary consultation sessions to discuss your goals."
    };
  }

  // Rule 5: When discussing conference sessions about innovation/technology
  if (lowerResponse.includes('session') && hasModerateInterest && messageCount > 4) {
    return {
      shouldSuggest: true,
      urgency: 'subtle',
      message: "Many of these conference insights can be transformed into actionable strategies. PS Advisory helps organizations translate innovation into practical implementation."
    };
  }

  return { shouldSuggest: false, urgency: 'none' };
}

/**
 * Format the meeting suggestion based on urgency
 */
export function formatMeetingSuggestion(
  context: MeetingSuggestionContext,
  sessionId: string
): string {
  if (!context.shouldSuggest || !context.message) {
    return '';
  }

  // Update session history
  const sessionHistory = sessionSuggestionCount.get(sessionId) || { count: 0, lastSuggested: new Date(0) };
  sessionSuggestionCount.set(sessionId, {
    count: sessionHistory.count + 1,
    lastSuggested: new Date()
  });

  const calendarLink = 'https://calendly.com/npaul-psadvisory/connection?month=2025-09';

  if (context.urgency === 'subtle') {
    // Subtle approach - just a brief mention with link
    return `\n\n---\n\n*${context.message} [Schedule a conversation](${calendarLink})*`;
  } else if (context.urgency === 'moderate') {
    // Moderate approach - clear value proposition with call to action
    return `\n\n---\n\n**Partner with PS Advisory**\n\n${context.message}\n\n📅 [Schedule a complimentary consultation](${calendarLink})`;
  }

  return '';
}

/**
 * Get a contextual footer for responses (used sparingly)
 */
export function getPSAdvisoryFooter(messageCount: number): string {
  // Only show footer on first message or after significant engagement
  if (messageCount === 1) {
    return '\n\n---\n*Powered by PS Advisory - Your partner in insurance technology transformation*';
  }

  if (messageCount === 10) {
    return '\n\n---\n*This demo showcases PS Advisory\'s expertise in building intelligent solutions for insurance organizations.*';
  }

  return '';
}

/**
 * Detect if user is asking about PS Advisory
 */
export function isAskingAboutPSAdvisory(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return lowerQuery.includes('ps advisory') ||
         lowerQuery.includes('psadvisory') ||
         lowerQuery.includes('nancy paul') ||
         lowerQuery.includes('who built this') ||
         lowerQuery.includes('who made this') ||
         lowerQuery.includes('who created this') ||
         lowerQuery.includes('about the company') ||
         lowerQuery.includes('consulting firm');
}

/**
 * Get comprehensive PS Advisory information
 */
export function getPSAdvisoryInfo(): string {
  return `## About PS Advisory

**PS Advisory** is a boutique insurance technology consulting firm founded by Andrew Bartels, specializing in helping insurance organizations transform their operations through innovative technology solutions.

We're particularly known for our:
- 🎯 **Four Quadrant Method™** for strategic planning
- 🔍 **Friction Gap Analysis™** for operational efficiency
- ⚕️ **Workers Compensation** transformation expertise
- 💰 **Life Insurance** modernization solutions
- ☁️ **Salesforce Insurance Cloud** implementations

### What would you like to know more about?

I can tell you about:
- Our founder Andrew Bartels and his vision
- Our signature methodologies (Four Quadrant Method or Friction Gap Analysis)
- Specific insurance lines we specialize in (Workers Comp, Life, P&C)
- Technology solutions we implement
- Client success stories and results
- How to connect with our team

**Quick Links:**
- 🌐 Visit [psadvisory.com](https://psadvisory.com)
- 📅 [Schedule a consultation](https://calendly.com/npaul-psadvisory/connection?month=2025-09)
- 📧 Contact: info@psadvisory.com

*Just ask about any specific area you're interested in, and I'll provide more details!*`;
}

/**
 * Get brief PS Advisory introduction
 */
export function getPSAdvisoryBrief(): string {
  return `**PS Advisory** is the insurance technology consulting firm behind this conference app. Founded by Andrew Bartels, we help insurance organizations modernize their operations through Salesforce implementations, AI solutions, and digital transformation strategies.

Want to know more? Ask me about:
• Our methodologies (Four Quadrant Method, Friction Gap Analysis)
• Our expertise (Workers Comp, Life Insurance, P&C)
• How we can help your organization`;
}

/**
 * Get detailed information about a specific PS Advisory topic
 */
export function getPSAdvisoryDetail(topic: string): string {
  const lowerTopic = topic.toLowerCase();

  if (lowerTopic.includes('andrew') || lowerTopic.includes('bartels') || lowerTopic.includes('founder')) {
    return `## Andrew Bartels, Founder & CEO

Andrew founded PS Advisory with a vision that insurance organizations deserve a Salesforce partner that understands their industry as well as the platform. With decades of experience in insurance technology, he launched PS Advisory to close that gap.

**Experience:**
- Decades of experience in insurance technology
- Vision to create a Salesforce partner that truly understands insurance
- Built PS Advisory from a focused vision to a full-service consultancy
- Leader in insurance technology transformation

**His Vision:**
"Insurance organizations deserve a Salesforce partner that understands their industry as well as the platform."

**Leadership Team:**
- **Hitesh Malhotra (CTO)**: 20+ years in Salesforce, 25+ certifications
- **Tom King (Director of Strategy)**: Former roles at AIG, IBM, Pegasystems, Salesforce
- **Nancy Paul (Senior Delivery Manager)**: 17 years project management, ROI focus
- **Judd Lehmkuhl (Solution Architect)**: Sales operations & Salesforce development
- **Prateek Shukla (Solution Architect)**: Full stack expertise & DevOps

Would you like to:
- Learn about PS Advisory's methodologies?
- Explore our insurance expertise areas?
- Meet with our team?`;
  }

  if (lowerTopic.includes('nancy') || lowerTopic.includes('paul')) {
    return `## Nancy Paul, Senior Delivery Manager

Nancy Paul is PS Advisory's Senior Delivery Manager, bringing 17 years of project management experience to help insurance clients achieve real ROI from their technology investments.

**Experience:**
- 17 years of project management expertise
- Specializes in insurance technology implementations
- Expert at aligning stakeholders and managing complex projects
- Ensures every project delivers on its promise
- Focuses on measurable ROI for clients

**Role at PS Advisory:**
Nancy manages the delivery of our most critical client engagements, ensuring projects stay on track, on budget, and deliver exceptional value. She bridges the gap between technical teams and business stakeholders.

**Expertise:**
- Complex implementation management
- Stakeholder alignment and communication
- ROI optimization
- Change management
- Team leadership

Would you like to:
- Learn more about our team?
- Explore our methodologies?
- Schedule a consultation?`;
  }

  if (lowerTopic.includes('four quadrant') || lowerTopic.includes('4 quadrant')) {
    return `## The Four Quadrant Method™

Our strategic framework evaluates digital transformation initiatives across four critical dimensions:

**📊 Quadrant 1: Business Impact**
Assessing revenue potential and cost reduction opportunities

**🔧 Quadrant 2: Technical Complexity**
Understanding integration needs and infrastructure requirements

**👥 Quadrant 3: Organizational Readiness**
Evaluating change management and training needs

**⏱️ Quadrant 4: Time to Value**
Balancing quick wins with long-term investments

**Benefits:**
✅ Prioritize technology investments effectively
✅ Minimize implementation risks
✅ Maximize ROI on transformation

Would you like to:
- See how this applies to your specific situation?
- Learn about our Friction Gap Analysis?
- Discuss a potential project?`;
  }

  if (lowerTopic.includes('friction gap')) {
    return `## The Friction Gap Analysis™

We identify and eliminate the gaps between what technology promises and what it actually delivers.

**Common Friction Points We Address:**

**Customer Experience:**
- Quote-to-bind delays
- Claims processing bottlenecks
- Communication gaps

**Operations:**
- Manual data entry
- System switching overhead
- Compliance burden

**Typical Results:**
- 40-60% reduction in processing time
- 30% improvement in customer satisfaction
- 50% reduction in error rates

Would you like to:
- Discuss friction points in your organization?
- See our Workers Comp or Life Insurance solutions?
- Schedule a consultation?`;
  }

  if (lowerTopic.includes('workers comp') || lowerTopic.includes('work comp') || lowerTopic.includes('wc')) {
    return `## Workers Compensation Excellence

PS Advisory has deep expertise in transforming Workers Comp operations:

**Key Solutions:**
- **Claims Automation**: FNOL processing, triage, medical bill review
- **Regulatory Compliance**: Multi-state tracking, NCCI reporting, EDI (FROI/SROI)
- **Cost Containment**: Predictive modeling, fraud detection, provider networks
- **Injured Worker Experience**: Mobile claims, real-time updates, return-to-work programs

**Typical Results:**
- 45% reduction in claim cycle time
- 30% improvement in return-to-work rates
- 35% reduction in medical costs

What aspect interests you most?
- Claims management transformation
- Regulatory compliance solutions
- Cost containment strategies
- Technology implementation`;
  }

  if (lowerTopic.includes('life insurance') || lowerTopic.includes('annuit')) {
    return `## Life Insurance & Annuities Solutions

We modernize life insurance operations from new business to claims:

**Core Capabilities:**
- **Automated Underwriting**: Instant issue, third-party data integration
- **Digital Distribution**: Agent portals, e-applications, commission management
- **Policy Administration**: Lifecycle management, illustrations, conversions
- **Customer Experience**: Self-service portals, e-signatures, online payments

**Typical Results:**
- 80% reduction in underwriting time
- 50% reduction in not-taken rates
- 3x faster product launches

What would help your organization most?
- Speeding up underwriting
- Improving agent productivity
- Enhancing customer experience
- Modernizing legacy systems`;
  }

  if (lowerTopic.includes('salesforce') || lowerTopic.includes('technology')) {
    return `## Technology Solutions

**Salesforce Expertise:**
- Insurance Cloud implementation
- Financial Services Cloud customization
- Custom Lightning components
- Integration with policy admin systems

**Beyond Salesforce:**
- AI/ML for underwriting and claims
- API-first architecture design
- Legacy system modernization
- Cloud migration strategies

**Our Approach:**
We're technology-agnostic and choose the best solution for your needs, though we have deep Salesforce expertise.

What's your technology priority?
- CRM implementation
- System integration
- Process automation
- Digital transformation strategy`;
  }

  // Default response for unrecognized topics
  return `I can provide more details about PS Advisory's:

• **Methodologies**: Four Quadrant Method, Friction Gap Analysis
• **Insurance Expertise**: Workers Comp, Life Insurance, P&C
• **Technology Solutions**: Salesforce, AI/automation, integrations
• **Leadership**: Nancy Paul and our team
• **Client Success**: Results and case studies

What would you like to explore?`;
}

/**
 * Get comprehensive PS Advisory information (full details for documentation)
 */
export function getPSAdvisoryFullInfo(): string {
  return `## About PS Advisory

**PS Advisory** is a boutique insurance technology consulting firm dedicated to bridging the gap between insurance business needs and technology solutions. We specialize in helping insurance organizations navigate digital transformation with confidence and clarity.

🌐 **Website**: [psadvisory.com](https://psadvisory.com)
📧 **Contact**: info@psadvisory.com
📍 **Serving**: Insurance organizations across North America

### Our Story

Founded by **Andrew Bartels**, PS Advisory emerged from a vision to provide insurance organizations with specialized technology expertise that truly understands the unique challenges of the insurance industry. With decades of experience in insurance technology, Andrew recognized that many consulting firms offered either deep insurance knowledge or technical expertise, but rarely both.

PS Advisory was created to fill this gap - combining deep insurance domain expertise with cutting-edge technology capabilities to deliver solutions that actually work in the real world of insurance operations.

### Leadership

**Andrew Bartels, Founder & CEO**
- Decades of experience in insurance technology
- Vision to bridge the gap between insurance needs and technology solutions
- Built PS Advisory into a full-service Salesforce consultancy
- Deep expertise across P&C, Life, and Health insurance domains
- Leads a team of certified Salesforce architects and developers
- Passionate advocate for transforming how insurance organizations work

**Leadership Team:**
- **Hitesh Malhotra (CTO)**: 20+ years in Salesforce ecosystem, 25+ certifications
- **Tom King (Director of Strategy)**: Actuary background, former roles at AIG, IBM, Pegasystems, Salesforce
- **Nancy Paul (Senior Delivery Manager)**: 17 years project management, specializes in ROI delivery
- **Judd Lehmkuhl (Solution Architect)**: Deep experience in sales operations and Salesforce development
- **Prateek Shukla (Solution Architect)**: Full tech stack expertise, DevOps and team leadership

### Our Mission

To empower insurance organizations to achieve operational excellence through intelligent technology solutions that reduce friction, increase efficiency, and enhance customer experiences.

### Our Values

**🎯 Insurance-First Thinking**
We start with insurance business needs, not technology features

**🤝 Partnership Approach**
We work alongside your team, not above them

**💡 Practical Innovation**
We implement solutions that work today while building for tomorrow

**📊 Measurable Impact**
We focus on outcomes that matter to your bottom line

**🔄 Continuous Improvement**
We believe in iterative enhancement over big-bang transformations

### What Sets Us Apart

✨ **Specialized Focus**: 100% dedicated to insurance technology
🏆 **Proven Track Record**: Successfully transformed operations for carriers managing billions in premiums
🎓 **Deep Expertise**: Combining insurance domain knowledge with technical excellence
🤝 **Trusted Advisor**: Long-term partnerships with leading insurance organizations
⚡ **Agile Delivery**: Fast, iterative implementations that deliver value quickly

### The Four Quadrant Method™

PS Advisory's signature **Four Quadrant Method** is a strategic framework for insurance digital transformation that evaluates initiatives across four critical dimensions:

**📊 Quadrant 1: Business Impact**
- Revenue generation potential
- Cost reduction opportunities
- Market differentiation
- Competitive advantage

**🔧 Quadrant 2: Technical Complexity**
- System integration requirements
- Data migration needs
- Infrastructure changes
- Security considerations

**👥 Quadrant 3: Organizational Readiness**
- Change management requirements
- Training needs
- Cultural alignment
- Resource availability

**⏱️ Quadrant 4: Time to Value**
- Quick wins vs. long-term investments
- Phased implementation opportunities
- ROI timeline
- Risk mitigation strategies

This method helps insurance organizations:
✅ Prioritize technology investments
✅ Balance quick wins with strategic initiatives
✅ Align technology with business objectives
✅ Minimize implementation risks
✅ Maximize ROI on digital transformation

### The Friction Gap Analysis™

PS Advisory's **Friction Gap Analysis** identifies and eliminates operational inefficiencies in insurance workflows:

**🔍 What is the Friction Gap?**
The Friction Gap represents the disconnect between:
- What technology promises vs. what it delivers
- Current processes vs. optimal workflows
- Customer expectations vs. actual experience
- System capabilities vs. user adoption

**📈 Key Areas of Analysis:**

**Customer Friction Points:**
- Quote-to-bind delays
- Policy servicing bottlenecks
- Claims processing inefficiencies
- Communication gaps

**Agent/Broker Friction Points:**
- Manual data entry requirements
- System switching overhead
- Commission tracking complexity
- Compliance burden

**Internal Friction Points:**
- Underwriting bottlenecks
- Data silos and duplication
- Manual reconciliation processes
- Reporting delays

**🎯 Friction Gap Solutions:**
1. **Process Automation** - Eliminate manual touchpoints
2. **System Integration** - Connect disparate systems
3. **Workflow Optimization** - Streamline operations
4. **User Experience Design** - Reduce cognitive load
5. **Data Unification** - Single source of truth

**💡 Benefits of Friction Gap Analysis:**
- 40-60% reduction in processing time
- 30% improvement in customer satisfaction
- 25% increase in employee productivity
- 50% reduction in error rates
- Faster time to market for new products

### Core Expertise

**⚕️ Workers Compensation Excellence**

PS Advisory has deep specialization in Workers Compensation, addressing the unique challenges of this complex line of business:

**Key Workers Comp Solutions:**
- **Claims Management Transformation**
  - Automated FNOL (First Notice of Loss) processing
  - Intelligent triage and severity scoring
  - Medical bill review automation
  - Return-to-work program tracking
  - Litigation management systems

- **Regulatory Compliance**
  - Multi-state compliance tracking
  - NCCI and state-specific reporting
  - EDI implementation (FROI/SROI)
  - Audit trail and documentation
  - Real-time regulatory updates

- **Cost Containment**
  - Pharmacy benefit management integration
  - Medical provider network optimization
  - Predictive modeling for high-cost claims
  - Subrogation opportunity identification
  - Fraud detection algorithms

- **Injured Worker Experience**
  - Mobile-first claims reporting
  - Real-time claim status updates
  - Provider search and scheduling
  - Digital document submission
  - Communication preference management

**Workers Comp Challenges We Solve:**
✅ Complex multi-state regulatory requirements
✅ Rising medical costs and claim severity
✅ Manual processes causing delays and errors
✅ Poor injured worker experience leading to litigation
✅ Lack of real-time visibility into claim status
✅ Inefficient medical management
✅ Difficulty identifying fraud patterns

**Technology Stack for Workers Comp:**
- Salesforce Insurance Cloud for claims management
- AI-powered document processing for medical records
- Predictive analytics for claim outcomes
- Integration with medical billing systems
- Mobile apps for field adjusters
- Real-time dashboards for executives

**Results in Workers Comp:**
- **45% reduction** in claim cycle time
- **30% improvement** in return-to-work rates
- **25% decrease** in litigation frequency
- **35% reduction** in medical costs through better management
- **50% faster** regulatory reporting
- **60% improvement** in adjuster productivity

**💰 Life Insurance & Annuities Excellence**

PS Advisory brings deep expertise in Life Insurance and Annuities, modernizing traditional life carriers and enabling digital-first distribution:

**Life Insurance Solutions:**
- **New Business & Underwriting**
  - Automated underwriting engines
  - Instant issue capabilities
  - Third-party data integration (MIB, Rx, MVR)
  - Reflexive questioning and jet issue
  - Paramedical exam scheduling
  - Requirements tracking and follow-up

- **Policy Administration**
  - Policy lifecycle management
  - Beneficiary management
  - Premium billing and collections
  - Policy loans and surrenders
  - Conversion processing
  - Illustrations and in-force ledgers

- **Distribution Management**
  - Agent/broker licensing and contracting
  - Commission calculation and disbursement
  - Hierarchy management
  - Production reporting and rankings
  - Lead distribution and tracking
  - Sales illustration tools

- **Digital Customer Experience**
  - Online applications and e-signatures
  - Self-service portals
  - Premium payment options
  - Policy value tracking
  - Beneficiary updates
  - Document delivery preferences

**Life Insurance Challenges We Solve:**
✅ Lengthy underwriting cycles (weeks to minutes)
✅ High not-taken rates due to process friction
✅ Complex product configuration and rules
✅ Manual illustration and proposal generation
✅ Disconnected agent experience
✅ Legacy system constraints
✅ Regulatory compliance across states

**Annuities & Retirement Solutions:**
- Variable, fixed, and indexed annuity administration
- Retirement income planning tools
- Guaranteed lifetime withdrawal benefits (GLWB)
- Death benefit calculations
- Systematic withdrawal processing
- 1035 exchange handling
- RMD calculations and notifications

**Technology Stack for Life Insurance:**
- Salesforce Financial Services Cloud
- Automated underwriting decision engines
- Electronic application platforms
- Commission calculation engines
- Actuarial modeling integration
- Document generation and e-delivery
- Real-time illustrations

**Results in Life Insurance:**
- **80% reduction** in underwriting time
- **65% improvement** in straight-through processing
- **40% increase** in agent productivity
- **50% reduction** in not-taken rates
- **30% decrease** in operational costs
- **90% digital adoption** by customers
- **3x faster** product launches

**🎯 Salesforce Solutions**
- Insurance Cloud implementation and customization
- Financial Services Cloud for insurance
- Custom Lightning components and apps
- Integration with policy admin systems

**🤖 AI & Automation**
- Underwriting automation and decisioning
- Claims triage and fraud detection
- Document processing and extraction
- Predictive analytics for risk assessment

**💼 Digital Transformation**
- Legacy system modernization
- API-first architecture design
- Cloud migration strategies
- Omnichannel customer experiences

**📊 Data & Analytics**
- Business intelligence dashboards
- Real-time reporting solutions
- Data warehouse design
- Predictive modeling

### Why PS Advisory?

✅ **Deep Insurance Expertise**: We understand the unique challenges of insurance - from regulatory compliance to complex rating algorithms
✅ **Technology Agnostic**: While specializing in Salesforce, we work with all major platforms
✅ **End-to-End Solutions**: From strategy to implementation to adoption
✅ **Proven Track Record**: Successfully delivered solutions for carriers processing billions in premiums

### Who We Serve

**🏢 Insurance Carriers**
- Property & Casualty
- Life & Annuities
- Health Insurance
- Specialty Lines
- Reinsurance

**🤝 Distribution Partners**
- Managing General Agents (MGAs)
- Managing General Underwriters (MGUs)
- Insurance Brokers
- Independent Agents
- Aggregators

**📊 By Company Size**
- Fortune 500 carriers seeking enterprise transformation
- Mid-market insurers modernizing legacy systems
- InsurTech startups building from scratch
- Regional carriers expanding capabilities

### Services Offered

1. **Strategic Consulting**: Technology roadmaps, vendor selection, digital strategy
2. **Implementation**: Full lifecycle implementation of CRM, policy admin, claims systems
3. **Integration**: API development, middleware, data synchronization
4. **Custom Development**: Bespoke applications, portals, and automation tools
5. **Training & Adoption**: Change management, user training, documentation
6. **Optimization**: Performance tuning, process improvement, automation

### Client Success Metrics

**📈 Typical Results Our Clients Achieve:**
- **70% reduction** in policy issuance time
- **50% improvement** in first-call resolution
- **60% decrease** in manual processing
- **3x increase** in agent productivity
- **40% reduction** in operational costs
- **90% user adoption** within 90 days
- **25% increase** in customer satisfaction scores

### Connect with PS Advisory

The PS Advisory team is here to help you navigate your insurance technology journey.

📅 **Schedule a consultation**: [Book a meeting](https://calendly.com/npaul-psadvisory/connection?month=2025-09)
✉️ **Email**: info@psadvisory.com
🔗 **LinkedIn**: Connect with Nancy Paul

*This ITC Vegas 2025 Conference App is a demonstration of PS Advisory's capabilities in building intelligent, AI-powered solutions for the insurance industry.*`;
}

/**
 * Check if the query relates to PS Advisory's expertise
 */
export function relatesToPSAdvisoryExpertise(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Check technologies
  const mentionsTechnology = PS_ADVISORY_EXPERTISE.technologies.some(tech =>
    lowerQuery.includes(tech)
  );

  // Check solutions
  const mentionsSolution = PS_ADVISORY_EXPERTISE.solutions.some(solution =>
    lowerQuery.includes(solution)
  );

  // Check industries
  const mentionsIndustry = PS_ADVISORY_EXPERTISE.industries.some(industry =>
    lowerQuery.includes(industry)
  );

  return mentionsTechnology || mentionsSolution || mentionsIndustry;
}