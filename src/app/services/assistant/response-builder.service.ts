import { Injectable } from '@angular/core';
import { KnowledgeQueryResponse, ActionLink, GroupedSearchResult } from './knowledge-base.service';

export interface FormattedBotMessage {
  id: string;
  sender: 'bot';
  title?: string;
  lead?: string;
  bullets?: string[];
  navigationPath?: string[];
  text?: string;
  groupedResults?: GroupedSearchResult[];
  actions?: ActionLink[];
  timestamp: string;
  isFallback?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ResponseBuilderService {

  /**
   * Formats raw knowledge base response into structured UI bot message
   */
  buildBotMessage(queryRes: KnowledgeQueryResponse, userQuery: string): FormattedBotMessage {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageId = `bot-${Date.now()}`;

    if (queryRes.type === 'topic' && queryRes.topic) {
      const t = queryRes.topic;
      return {
        id: messageId,
        sender: 'bot',
        title: t.title,
        lead: t.lead,
        bullets: t.bullets,
        navigationPath: t.navigationPath,
        actions: t.actions,
        timestamp
      };
    }

    if (queryRes.type === 'search_results' && queryRes.searchResults) {
      return {
        id: messageId,
        sender: 'bot',
        title: `Search Results for "${userQuery}"`,
        lead: 'Here are the matching resources across AskDB portal:',
        groupedResults: queryRes.searchResults,
        actions: [
          { label: 'Platform Features', path: '/features' },
          { label: 'Security Center', path: '/security' }
        ],
        timestamp
      };
    }

    // Professional Fallback
    return {
      id: messageId,
      sender: 'bot',
      title: 'No Exact Match Found',
      lead: "I couldn't find an exact answer for your query.",
      text: 'You may find one of these enterprise resources helpful:',
      actions: queryRes.fallbackResources || [
        { label: 'Documentation', path: '/security' },
        { label: 'Pricing Overview', path: '/pricing' },
        { label: 'Request Access Wizard', path: '/request-access' },
        { label: 'Contact Support', path: '/contact' }
      ],
      isFallback: true,
      timestamp
    };
  }
}
