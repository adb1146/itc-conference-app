/**
 * Intent Classifier Service
 * Wraps the existing AI intent classification logic
 */

import { classifyUserIntent } from '@/lib/ai-intent-classifier';
import { IIntentClassifier, IntentClassification, IntentType } from '@/application/services/ChatService';

export class IntentClassifier implements IIntentClassifier {
  async classify(message: string, context?: any): Promise<IntentClassification> {
    // Use existing AI intent classifier
    const result = await classifyUserIntent(message, context?.history || []);

    // Map to our domain model
    return {
      type: this.mapIntentType(result.primary_intent),
      confidence: result.confidence,
      entities: result.extracted_entities,
      searchType: this.determineSearchType(result.primary_intent),
      suggestedAction: result.suggested_action
    };
  }

  private mapIntentType(type: string): IntentType {
    const mapping: Record<string, IntentType> = {
      'information_seeking': 'information_seeking',
      'agenda_building': 'agenda_building',
      'local_recommendations': 'local_recommendations',
      'profile_research': 'profile_research',
      'company_research': 'profile_research',
      'speaker_lookup': 'profile_research',
      'greeting': 'greeting',
      'general_chat': 'general_chat',
      'registration': 'general_chat',
      'preference_setting': 'general_chat',
      'practical_need': 'local_recommendations',
      'social_planning': 'local_recommendations',
      'navigation_help': 'local_recommendations',
      'emotional_support': 'general_chat'
    };

    return mapping[type] || 'general_chat';
  }

  private determineSearchType(intentType: string): 'semantic' | 'keyword' | 'hybrid' {
    // Determine best search strategy based on intent
    switch (intentType) {
      case 'information_seeking':
        return 'semantic'; // Concepts and meaning matter most
      case 'speaker_lookup':
      case 'company_research':
        return 'keyword'; // Exact names matter
      case 'agenda_building':
        return 'hybrid'; // Both semantic understanding and keywords
      default:
        return 'hybrid';
    }
  }
}