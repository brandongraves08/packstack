// API configuration
// Use a function to get the API URL to avoid initialization issues
export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:5001';
}

// For backward compatibility
export const BASE_API_URL = getApiUrl();

// Default settings
export const DEFAULT_SETTINGS = {
  defaultCategory: 'Uncategorized',
  defaultUnit: 'g', // Default weight unit
  defaultCurrency: 'USD',
}

// Storage keys
export const STORAGE_KEYS = {
  userProfile: 'packstack_user_profile',
  userPreferences: 'packstack_user_preferences',
  recentSearches: 'packstack_recent_searches',
  theme: 'packstack_theme',
}

// Feature flags
export const FEATURES = {
  enableWalmartIntegration: true,
  enableBarcodeScanning: true,
  enablePriceComparison: true,
  enableUserRecommendations: true,
  enableContentFiltering: true,
}
