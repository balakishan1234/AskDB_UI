import { Component, OnInit, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs';
import { KnowledgeBaseService, ActionLink } from '../../../services/assistant/knowledge-base.service';
import { ResponseBuilderService, FormattedBotMessage } from '../../../services/assistant/response-builder.service';

export interface UserMessage {
  id: string;
  sender: 'user';
  text: string;
  timestamp: string;
}

export type ChatMessageItem = FormattedBotMessage | UserMessage;

export interface SuggestedTopicCard {
  id: string;
  title: string;
  description: string;
  query: string;
}

export interface SessionMemoryState {
  lastTopicId?: string;
  lastTopicTitle?: string;
  lastQuery?: string;
  visitedRoute?: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html'
})
export class ChatbotComponent implements OnInit {
  isOpen = signal<boolean>(false);
  isTyping = signal<boolean>(false);
  showSuggestedTopics = signal<boolean>(false);
  typingStatusText = signal<string>('Searching documentation...');
  userMessage = '';
  currentRoute = signal<string>('/');

  messages = signal<ChatMessageItem[]>([]);
  sessionMemory = signal<SessionMemoryState>({});

  suggestedTopics: SuggestedTopicCard[] = [
    {
      id: 'req-access',
      title: 'Request Access',
      description: 'Start the onboarding process',
      query: 'how do i request access'
    },
    {
      id: 'pricing',
      title: 'Pricing',
      description: 'Compare available plans',
      query: 'pricing & enterprise plans'
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Learn about RBAC and encryption',
      query: 'security & data protection'
    },
    {
      id: 'docs',
      title: 'Documentation',
      description: 'Explore platform guides',
      query: 'documentation'
    },
    {
      id: 'databases',
      title: 'Supported Databases',
      description: 'View compatible database engines',
      query: 'supported databases'
    },
    {
      id: 'features',
      title: 'Platform Features',
      description: 'Discover AI query studio',
      query: 'platform features'
    }
  ];

  contextualPrompt = computed(() => {
    const route = this.currentRoute();
    if (route.includes('pricing')) {
      return 'Need help choosing a plan?';
    } else if (route.includes('security')) {
      return 'Questions about encryption or RBAC?';
    } else if (route.includes('request-access')) {
      return 'Need help completing the request form?';
    } else if (route.includes('features')) {
      return 'Exploring natural language queries or supported databases?';
    } else if (route.includes('status')) {
      return 'Checking system availability or API health?';
    } else {
      return 'Looking for an overview of AskDB?';
    }
  });

  constructor(
    private router: Router,
    private knowledgeBase: KnowledgeBaseService,
    private responseBuilder: ResponseBuilderService
  ) {}

  ngOnInit(): void {
    this.currentRoute.set(this.router.url || '/');

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(val => {
      this.currentRoute.set(val.urlAfterRedirects || val.url || '/');
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && (event.key === '/' || event.key === '?')) {
      event.preventDefault();
      this.toggleChat();
    } else if (event.key === 'Escape' && this.isOpen()) {
      event.preventDefault();
      this.isOpen.set(false);
    }
  }

  handleTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleChat(): void {
    this.isOpen.update(v => !v);
  }

  toggleSuggestedTopics(): void {
    this.showSuggestedTopics.update(v => !v);
  }

  selectTopicCard(topic: SuggestedTopicCard): void {
    this.showSuggestedTopics.set(false);
    this.sendMessage(topic.query);
  }

  sendMessage(textInput?: string): void {
    const text = textInput || this.userMessage.trim();
    if (!text) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Push User Message
    const userMsg: UserMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp
    };

    this.messages.update(msgs => [...msgs, userMsg]);

    if (!textInput) {
      this.userMessage = '';
    }

    // Set professional typing status
    const statusTexts = ['Searching documentation...', 'Evaluating intent...', 'Preparing response...'];
    const randomStatus = statusTexts[Math.floor(Math.random() * statusTexts.length)];
    this.typingStatusText.set(randomStatus);
    this.isTyping.set(true);

    setTimeout(() => {
      this.isTyping.set(false);

      const queryRes = this.knowledgeBase.queryKnowledge(text);
      const botMsg = this.responseBuilder.buildBotMessage(queryRes, text);

      this.messages.update(msgs => [...msgs, botMsg]);

      // Update session memory
      if (queryRes.topic) {
        this.sessionMemory.set({
          lastTopicId: queryRes.topic.id,
          lastTopicTitle: queryRes.topic.title,
          lastQuery: text,
          visitedRoute: this.currentRoute()
        });
      }
    }, 450);
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  resetConversation(): void {
    this.messages.set([]);
  }
}
