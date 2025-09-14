import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actionType?: string;
}

const STORAGE_PREFIX = 'itc-chat-history';
const ANON_KEY = 'anonymous';
const MAX_MESSAGES = 100; // Limit storage size
const EXPIRY_HOURS = 24; // Clear old chats after 24 hours

interface StoredChat {
  messages: Message[];
  timestamp: number;
  version: number;
  userId?: string;
}

export function useChatPersistence(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session } = useSession();

  // Counter for generating unique IDs
  let idCounter = 0;
  const generateUniqueId = () => {
    idCounter++;
    return `msg_${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // Generate a unique storage key based on user session
  const getStorageKey = () => {
    if (session?.user?.email) {
      // For logged-in users, use their email hash
      const hash = btoa(session.user.email).replace(/[^a-zA-Z0-9]/g, '');
      return `${STORAGE_PREFIX}-${hash}`;
    } else {
      // For anonymous users, use session storage instead of localStorage
      // This ensures chat is cleared when browser is closed
      return `${STORAGE_PREFIX}-${ANON_KEY}`;
    }
  };

  // Load messages from storage on mount or when session changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storageKey = getStorageKey();
    const storage = session?.user ? localStorage : sessionStorage;
    
    try {
      const stored = storage.getItem(storageKey);
      if (stored) {
        const data: StoredChat = JSON.parse(stored);
        
        // Verify this chat belongs to the current user
        if (session?.user && data.userId && data.userId !== session.user.email) {
          // This chat belongs to a different user, don't load it
          storage.removeItem(storageKey);
          if (initialMessages.length > 0) {
            setMessages(initialMessages);
          }
          setIsLoaded(true);
          return;
        }
        
        // Check if chat is expired
        const hoursOld = (Date.now() - data.timestamp) / (1000 * 60 * 60);
        if (hoursOld < EXPIRY_HOURS) {
          // Restore messages with proper Date objects and regenerate IDs to avoid conflicts
          const restoredMessages = data.messages.map(msg => ({
            ...msg,
            id: generateUniqueId(), // Generate new unique ID to avoid conflicts
            timestamp: new Date(msg.timestamp)
          }));
          
          // Only restore if we have more than just the welcome message
          if (restoredMessages.length > 1) {
            setMessages(restoredMessages);
          } else if (initialMessages.length > 0) {
            setMessages(initialMessages);
          }
        } else {
          // Clear expired chat
          storage.removeItem(storageKey);
          if (initialMessages.length > 0) {
            setMessages(initialMessages);
          }
        }
      } else if (initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    }
    
    setIsLoaded(true);
  }, [session]);

  // Save messages to storage whenever they change
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    if (messages.length === 0) return;
    
    const storageKey = getStorageKey();
    const storage = session?.user ? localStorage : sessionStorage;
    
    try {
      // Limit the number of messages stored
      const messagesToStore = messages.slice(-MAX_MESSAGES);
      
      const dataToStore: StoredChat = {
        messages: messagesToStore,
        timestamp: Date.now(),
        version: 1,
        userId: session?.user?.email || undefined
      };
      
      storage.setItem(storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Failed to save chat history:', error);
      // If storage is full, try to clear old data
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          storage.removeItem(storageKey);
          // Try again with current messages only
          const minimalData: StoredChat = {
            messages: messages.slice(-20), // Keep only last 20 messages
            timestamp: Date.now(),
            version: 1,
            userId: session?.user?.email || undefined
          };
          storage.setItem(storageKey, JSON.stringify(minimalData));
        } catch (retryError) {
          console.error('Failed to save even minimal chat history:', retryError);
        }
      }
    }
  }, [messages, isLoaded, session]);

  // Function to clear chat history
  const clearHistory = () => {
    setMessages(initialMessages);
    const storageKey = getStorageKey();
    const storage = session?.user ? localStorage : sessionStorage;
    storage.removeItem(storageKey);
  };

  // Function to add a new message
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Function to update messages
  const updateMessages = (updater: (prev: Message[]) => Message[]) => {
    setMessages(updater);
  };

  return {
    messages,
    setMessages: updateMessages,
    addMessage,
    clearHistory,
    isLoaded
  };
}