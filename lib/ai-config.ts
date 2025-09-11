/**
 * Centralized AI Configuration
 * This file ensures consistent model usage across the application
 */

export const AI_CONFIG = {
  // Primary model for all AI features
  PRIMARY_MODEL: 'claude-opus-4-1-20250805',
  
  // Fallback models (if needed)
  FALLBACK_MODEL: 'claude-3-5-sonnet-20241022',
  
  // Model display names for UI
  MODEL_DISPLAY_NAMES: {
    'claude-opus-4-1-20250805': 'Claude Opus 4.1',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'claude-3-haiku-20240307': 'Claude 3 Haiku'
  },
  
  // Token limits per model
  TOKEN_LIMITS: {
    'claude-opus-4-1-20250805': 2000,
    'claude-3-5-sonnet-20241022': 1500,
    'claude-3-haiku-20240307': 1000
  },
  
  // Temperature settings
  DEFAULT_TEMPERATURE: 0.7,
  
  // API configuration
  API_TIMEOUT: 30000, // 30 seconds
  
  // Validation function
  validateModel: (model: string): boolean => {
    const validModels = [
      'claude-opus-4-1-20250805',
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307'
    ];
    return validModels.includes(model);
  },
  
  // Get current model info
  getCurrentModelInfo: () => {
    return {
      model: AI_CONFIG.PRIMARY_MODEL,
      displayName: AI_CONFIG.MODEL_DISPLAY_NAMES[AI_CONFIG.PRIMARY_MODEL],
      tokenLimit: AI_CONFIG.TOKEN_LIMITS[AI_CONFIG.PRIMARY_MODEL]
    };
  }
};

// Export for use in API routes
export const getAIModel = () => AI_CONFIG.PRIMARY_MODEL;
export const getTokenLimit = () => AI_CONFIG.TOKEN_LIMITS[AI_CONFIG.PRIMARY_MODEL];
export const getModelDisplayName = () => AI_CONFIG.MODEL_DISPLAY_NAMES[AI_CONFIG.PRIMARY_MODEL];