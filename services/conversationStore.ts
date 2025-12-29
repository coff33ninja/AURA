// Conversation storage - now uses server-side SQLite via API
// Replaces IndexedDB with persistent server storage

export interface ConversationMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sessionId: string;
}

export interface ConversationSession {
  id: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
}

const API_BASE = '';

class ConversationStore {
  private currentSessionId: string = '';
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Start a new conversation session on the server
      const response = await fetch(`${API_BASE}/api/conversations/session/start`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentSessionId = data.sessionId;
        console.log('[ConversationStore] Session started:', this.currentSessionId);
      } else {
        // Fallback to local session ID if server unavailable
        this.currentSessionId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.warn('[ConversationStore] Server unavailable, using local session');
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('[ConversationStore] Failed to init:', error);
      this.currentSessionId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.initialized = true;
    }
  }

  startNewSession(): string {
    // End current session if exists
    if (this.currentSessionId && !this.currentSessionId.startsWith('local_')) {
      fetch(`${API_BASE}/api/conversations/session/${this.currentSessionId}/end`, {
        method: 'POST',
      }).catch(() => {});
    }
    
    // Start new session
    fetch(`${API_BASE}/api/conversations/session/start`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(data => {
        this.currentSessionId = data.sessionId;
        console.log('[ConversationStore] New session started:', this.currentSessionId);
      })
      .catch(() => {
        this.currentSessionId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      });
    
    return this.currentSessionId;
  }

  async saveMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    if (!content.trim()) return;
    
    // Ensure initialized
    if (!this.initialized) {
      await this.init();
    }

    try {
      const response = await fetch(`${API_BASE}/api/conversations/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.currentSessionId,
          role,
          content: content.trim(),
        }),
      });
      
      if (!response.ok) {
        console.warn('[ConversationStore] Failed to save message');
      }
    } catch (error) {
      console.warn('[ConversationStore] Failed to save message:', error);
    }
  }

  async getRecentMessages(limit: number = 20): Promise<ConversationMessage[]> {
    try {
      const response = await fetch(`${API_BASE}/api/conversations/recent?limit=${limit}`);
      
      if (!response.ok) return [];
      
      const messages = await response.json();
      
      // Convert server format to expected format
      return messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).getTime(),
        sessionId: m.sessionId,
      }));
    } catch (error) {
      console.warn('[ConversationStore] Failed to get messages:', error);
      return [];
    }
  }

  async getConversationSummary(maxMessages: number = 10): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/api/conversations/summary?limit=${maxMessages}`);
      
      if (!response.ok) return '';
      
      const data = await response.json();
      return data.summary || '';
    } catch (error) {
      console.warn('[ConversationStore] Failed to get summary:', error);
      return '';
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/conversations`, {
        method: 'DELETE',
      });
      
      // Start a new session after clearing
      this.startNewSession();
    } catch (error) {
      console.warn('[ConversationStore] Failed to clear history:', error);
    }
  }

  async getStats(): Promise<{ totalMessages: number; totalSessions: number }> {
    try {
      const response = await fetch(`${API_BASE}/api/conversations/stats`);
      
      if (!response.ok) return { totalMessages: 0, totalSessions: 0 };
      
      return await response.json();
    } catch (error) {
      console.warn('[ConversationStore] Failed to get stats:', error);
      return { totalMessages: 0, totalSessions: 0 };
    }
  }

  getCurrentSessionId(): string {
    return this.currentSessionId;
  }
}

// Singleton instance
export const conversationStore = new ConversationStore();
