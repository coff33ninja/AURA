// IndexedDB-based conversation storage for persistent memory

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

const DB_NAME = 'aura_conversations';
const DB_VERSION = 1;
const MESSAGES_STORE = 'messages';
const SESSIONS_STORE = 'sessions';

class ConversationStore {
  private db: IDBDatabase | null = null;
  private currentSessionId: string = '';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        this.startNewSession();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Messages store
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { 
            keyPath: 'id' 
          });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
        }
      };
    });
  }

  startNewSession(): string {
    this.currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.db) {
      const tx = this.db.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      store.add({
        id: this.currentSessionId,
        startTime: Date.now(),
        messageCount: 0
      });
    }
    
    return this.currentSessionId;
  }

  async saveMessage(role: 'user' | 'assistant', content: string): Promise<void> {
    if (!this.db || !content.trim()) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');
      
      // Save message
      const messagesStore = tx.objectStore(MESSAGES_STORE);
      messagesStore.add({
        role,
        content: content.trim(),
        timestamp: Date.now(),
        sessionId: this.currentSessionId
      });

      // Update session message count
      const sessionsStore = tx.objectStore(SESSIONS_STORE);
      const getRequest = sessionsStore.get(this.currentSessionId);
      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          session.messageCount++;
          session.endTime = Date.now();
          sessionsStore.put(session);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRecentMessages(limit: number = 20): Promise<ConversationMessage[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(MESSAGES_STORE, 'readonly');
      const store = tx.objectStore(MESSAGES_STORE);
      const index = store.index('timestamp');
      
      const messages: ConversationMessage[] = [];
      const request = index.openCursor(null, 'prev'); // Newest first

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && messages.length < limit) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages.reverse()); // Return in chronological order
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getConversationSummary(maxMessages: number = 10): Promise<string> {
    const messages = await this.getRecentMessages(maxMessages);
    
    if (messages.length === 0) {
      return '';
    }

    // Format as conversation history
    const history = messages.map(m => {
      const role = m.role === 'user' ? 'User' : 'Aura';
      // Truncate long messages
      const content = m.content.length > 200 
        ? m.content.substring(0, 200) + '...' 
        : m.content;
      return `${role}: ${content}`;
    }).join('\n');

    return `[Previous conversation context]\n${history}\n[End of context]`;
  }

  async clearHistory(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');
      tx.objectStore(MESSAGES_STORE).clear();
      tx.objectStore(SESSIONS_STORE).clear();
      tx.oncomplete = () => {
        this.startNewSession();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async getStats(): Promise<{ totalMessages: number; totalSessions: number }> {
    if (!this.db) return { totalMessages: 0, totalSessions: 0 };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readonly');
      
      let totalMessages = 0;
      let totalSessions = 0;

      const messagesCount = tx.objectStore(MESSAGES_STORE).count();
      messagesCount.onsuccess = () => { totalMessages = messagesCount.result; };

      const sessionsCount = tx.objectStore(SESSIONS_STORE).count();
      sessionsCount.onsuccess = () => { totalSessions = sessionsCount.result; };

      tx.oncomplete = () => resolve({ totalMessages, totalSessions });
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Singleton instance
export const conversationStore = new ConversationStore();
