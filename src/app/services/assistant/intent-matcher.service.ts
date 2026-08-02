import { Injectable } from '@angular/core';

export interface IntentResult {
  intentId: string;
  confidence: number; // 0 to 1
  normalizedQuery: string;
  matchedTokens: string[];
}

@Injectable({
  providedIn: 'root'
})
export class IntentMatcherService {
  private fillerWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'how', 'what', 'where', 'when',
    'why', 'who', 'which', 'can', 'could', 'would', 'should', 'i', 'you', 'he',
    'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
    'please', 'tell', 'about', 'find', 'show', 'give', 'get', 'need', 'want'
  ]);

  private synonymMap: Record<string, string[]> = {
    pricing: [
      'pricing', 'plans', 'subscription', 'cost', 'license', 'how much',
      'enterprise plan', 'pay', 'billing', 'starter', 'professional', 'tier', 'custom plan'
    ],
    security: [
      'security', 'secure', 'encryption', 'rbac', 'soc2', 'permissions',
      'auth', 'audit', 'privacy', 'isolation', 'data protection', 'zero self-registration', 'compliance'
    ],
    request_access: [
      'request access', 'access', 'request', 'onboarding', 'signup', 'invite',
      'approval', 'wizard', 'join', 'account', 'register', 'create account'
    ],
    documentation: [
      'documentation', 'docs', 'guides', 'manual', 'help', 'api', 'sdk',
      'reference', 'learn', 'tutorial', 'instructions'
    ],
    databases: [
      'databases', 'supported databases', 'postgres', 'postgresql', 'sql server',
      'mssql', 'mysql', 'oracle', 'mongodb', 'snowflake', 'redshift', 'sqlite', 'connectors', 'db'
    ],
    features: [
      'features', 'platform features', 'capabilities', 'visualizer', 'natural language',
      'sql generation', 'query', 'schema', 'workspace', 'studio'
    ],
    navigation: [
      'navigation', 'navigate', 'where', 'location', 'settings', 'user management',
      'roles', 'menu', 'go to', 'find page', 'how to find'
    ],
    status: [
      'status', 'system health', 'uptime', 'system status', 'latency', 'api status', 'health'
    ],
    contact: [
      'contact', 'sales', 'contact sales', 'support', 'reach out', 'email', 'team'
    ]
  };

  private cache = new Map<string, IntentResult>();

  /**
   * Normalizes input: lowercase, remove punctuation, strip filler words
   */
  normalizeInput(raw: string): { text: string; tokens: string[] } {
    if (!raw) return { text: '', tokens: [] };

    // Lowercase & remove non-alphanumeric except spaces
    const clean = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const rawTokens = clean.split(/\s+/).filter(Boolean);

    const tokens = rawTokens.filter(t => !this.fillerWords.has(t));

    return {
      text: tokens.join(' '),
      tokens
    };
  }

  /**
   * Matches intent with intent scoring and caching
   */
  matchIntent(rawQuery: string): IntentResult {
    const { text, tokens } = this.normalizeInput(rawQuery);
    if (!text && tokens.length === 0) {
      return { intentId: 'unknown', confidence: 0, normalizedQuery: '', matchedTokens: [] };
    }

    const cacheKey = text;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const rawLower = rawQuery.toLowerCase();
    let bestIntent = 'unknown';
    let maxScore = 0;
    let bestMatchedTokens: string[] = [];

    for (const [intentId, synonyms] of Object.entries(this.synonymMap)) {
      let currentScore = 0;
      const currentMatchedTokens: string[] = [];

      for (const synonym of synonyms) {
        // Exact phrase match in original raw query
        if (rawLower.includes(synonym)) {
          currentScore += 1.0;
          currentMatchedTokens.push(synonym);
        } else {
          // Token level matching
          const synTokens = synonym.split(' ');
          for (const synToken of synTokens) {
            if (tokens.includes(synToken)) {
              currentScore += 0.4;
              if (!currentMatchedTokens.includes(synToken)) {
                currentMatchedTokens.push(synToken);
              }
            }
          }
        }
      }

      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestIntent = intentId;
        bestMatchedTokens = currentMatchedTokens;
      }
    }

    const confidence = Math.min(1.0, maxScore >= 1.0 ? 0.95 : maxScore > 0.3 ? 0.7 : 0.2);

    const result: IntentResult = {
      intentId: bestIntent,
      confidence,
      normalizedQuery: text,
      matchedTokens: bestMatchedTokens
    };

    this.cache.set(cacheKey, result);
    return result;
  }
}
