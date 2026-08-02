import { Injectable } from '@angular/core';
import { IntentMatcherService, IntentResult } from './intent-matcher.service';

export interface ActionLink {
  label: string;
  path: string;
}

export interface KnowledgeTopic {
  id: string;
  title: string;
  lead: string;
  bullets: string[];
  navigationPath?: string[];
  actions: ActionLink[];
  category: 'Pages' | 'Features' | 'Documentation' | 'Security' | 'Actions';
}

export interface GroupedSearchResult {
  category: string;
  items: { title: string; description: string; path: string }[];
}

export interface KnowledgeQueryResponse {
  type: 'topic' | 'search_results' | 'fallback';
  topic?: KnowledgeTopic;
  searchResults?: GroupedSearchResult[];
  fallbackResources?: ActionLink[];
  intentConfidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {

  private topics: Record<string, KnowledgeTopic> = {
    pricing: {
      id: 'pricing',
      title: 'Enterprise Pricing & Subscription Plans',
      lead: 'AskDB provides transparent, scalable pricing tiers designed for enterprise security and database intelligence:',
      bullets: [
        'Starter Tier: ₹1,000/mo for 5 users with standard connectors',
        'Professional Tier: ₹2,500/mo for 25 users with advanced query analytics',
        'Enterprise Custom: Custom licensing, dedicated SLAs, and on-premise deployments'
      ],
      actions: [
        { label: 'View Pricing Matrix', path: '/pricing' },
        { label: 'Request Enterprise Quote', path: '/contact' }
      ],
      category: 'Pages'
    },

    security: {
      id: 'security',
      title: 'Enterprise Security Architecture',
      lead: 'AskDB isolates customer database infrastructure using zero self-registration and strict enterprise security controls:',
      bullets: [
        'Role-Based Access Control (RBAC) with granular table/query permissions',
        'End-to-End Encrypted communications (TLS 1.3 & AES-256 at rest)',
        'Comprehensive audit logging for database queries and user actions',
        'SOC2 Type II compliance standards and zero self-registration'
      ],
      actions: [
        { label: 'Security Documentation', path: '/security' },
        { label: 'Privacy Policy', path: '/privacy' }
      ],
      category: 'Security'
    },

    request_access: {
      id: 'request_access',
      title: 'Guided Access Request Workflow',
      lead: 'To maintain enterprise compliance, self-registration is disabled. Account creation follows an administrator approval workflow:',
      bullets: [
        'Step 1: Complete our 7-step guided onboarding wizard',
        'Step 2: Submit workspace specs, organization domain, and requested role',
        'Step 3: Administrator reviews and approves request within 4 business hours'
      ],
      actions: [
        { label: 'Request Access Wizard', path: '/request-access' }
      ],
      category: 'Actions'
    },

    documentation: {
      id: 'documentation',
      title: 'Platform Documentation & Guides',
      lead: 'Comprehensive technical reference material for AskDB platform administrators and database users:',
      bullets: [
        'Administrator Console Configuration & Workspace Setup',
        'Database Driver Configuration (SQL Server, Postgres, Oracle, MongoDB)',
        'Natural Language Query Best Practices & Schema Visualizer Usage'
      ],
      actions: [
        { label: 'Security Overview', path: '/security' },
        { label: 'System Health', path: '/status' }
      ],
      category: 'Documentation'
    },

    databases: {
      id: 'databases',
      title: 'Supported Database Connectors',
      lead: 'AskDB connects to all leading enterprise SQL and NoSQL database engines natively:',
      bullets: [
        'Relational SQL: Microsoft SQL Server, PostgreSQL, MySQL, Oracle Database, SQLite',
        'NoSQL & Document: MongoDB Enterprise & Atlas',
        'Data Warehouses: Snowflake, Amazon Redshift'
      ],
      actions: [
        { label: 'Explore Platform Features', path: '/features' }
      ],
      category: 'Features'
    },

    features: {
      id: 'features',
      title: 'AskDB Platform Features',
      lead: 'Built from the ground up for modern enterprise database operations:',
      bullets: [
        'Natural Language SQL & Mongo Query Translation',
        'Interactive Schema Visualizer with relational ER diagrams',
        'Multi-workspace isolation & zero-trust query guardrails'
      ],
      actions: [
        { label: 'View Features', path: '/features' }
      ],
      category: 'Features'
    },

    navigation: {
      id: 'navigation',
      title: 'Platform Navigation Guide',
      lead: 'You can navigate to key administration settings using the following menu hierarchy:',
      bullets: [
        'User & Role Management: Settings → User Management → Roles',
        'Database Workspace Setup: Admin Console → Workspaces → Add New',
        'Audit Logs & Execution History: Admin Console → Audit Trail'
      ],
      navigationPath: ['Settings', 'User Management', 'Roles'],
      actions: [
        { label: 'Go to Admin Login', path: '/login' }
      ],
      category: 'Actions'
    },

    status: {
      id: 'status',
      title: 'System Health & Availability',
      lead: 'AskDB maintains 99.99% uptime across all production regions and query translation proxy nodes.',
      bullets: [
        'API Gateway: 100% Operational',
        'Query Engine Proxy: Operational (Avg response < 120ms)',
        'Database Connectors: Operational'
      ],
      actions: [
        { label: 'Check Live System Status', path: '/status' }
      ],
      category: 'Pages'
    },

    contact: {
      id: 'contact',
      title: 'Contact Enterprise Support & Sales',
      lead: 'Have questions about custom SLAs, dedicated infrastructure, or migration support?',
      bullets: [
        'Sales Engineering: Direct enterprise onboarding assistance',
        'Technical Support: Dedicated 24/7 support channels for Enterprise subscribers'
      ],
      actions: [
        { label: 'Contact Sales', path: '/contact' }
      ],
      category: 'Pages'
    }
  };

  constructor(private intentMatcher: IntentMatcherService) {}

  /**
   * Primary entry point for querying the knowledge base.
   * Can be replaced with API call in the future without changing component code.
   */
  queryKnowledge(userQuery: string): KnowledgeQueryResponse {
    const match: IntentResult = this.intentMatcher.matchIntent(userQuery);

    if (match.intentId !== 'unknown' && match.confidence >= 0.5 && this.topics[match.intentId]) {
      return {
        type: 'topic',
        topic: this.topics[match.intentId],
        intentConfidence: match.confidence
      };
    }

    // Check if query is looking for grouped search results across the portal
    const searchResults = this.searchPortalGrouped(userQuery);
    if (searchResults.length > 0) {
      return {
        type: 'search_results',
        searchResults,
        intentConfidence: 0.6
      };
    }

    // Clean fallback response
    return {
      type: 'fallback',
      fallbackResources: [
        { label: 'Documentation', path: '/security' },
        { label: 'Pricing Overview', path: '/pricing' },
        { label: 'Request Access Wizard', path: '/request-access' },
        { label: 'Contact Support', path: '/contact' }
      ],
      intentConfidence: 0
    };
  }

  /**
   * Returns grouped search results (Pages, Features, Documentation)
   */
  private searchPortalGrouped(query: string): GroupedSearchResult[] {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const pagesGroup: GroupedSearchResult = {
      category: 'Pages',
      items: []
    };
    const featuresGroup: GroupedSearchResult = {
      category: 'Features',
      items: []
    };
    const docsGroup: GroupedSearchResult = {
      category: 'Documentation',
      items: []
    };

    for (const topic of Object.values(this.topics)) {
      const isMatch = topic.title.toLowerCase().includes(q) ||
                      topic.lead.toLowerCase().includes(q) ||
                      topic.bullets.some(b => b.toLowerCase().includes(q));

      if (isMatch) {
        const item = {
          title: topic.title,
          description: topic.lead,
          path: topic.actions[0]?.path || '/'
        };

        if (topic.category === 'Pages') pagesGroup.items.push(item);
        else if (topic.category === 'Features') featuresGroup.items.push(item);
        else docsGroup.items.push(item);
      }
    }

    return [pagesGroup, featuresGroup, docsGroup].filter(g => g.items.length > 0);
  }
}
