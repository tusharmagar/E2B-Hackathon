import { UserSession } from './types.js';

// In-memory session store
// For production, use Vercel KV or Redis
const sessions = new Map<string, UserSession>();

// Auto-cleanup old sessions after 1 hour
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

export function getSession(userId: string): UserSession | undefined {
  const session = sessions.get(userId);
  
  if (session) {
    // Check if session expired
    const now = new Date();
    if (now.getTime() - session.lastActivity.getTime() > SESSION_TIMEOUT) {
      sessions.delete(userId);
      return undefined;
    }
  }
  
  return session;
}

export function createSession(userId: string): UserSession {
  const session: UserSession = {
    userId,
    conversationHistory: [],
    lastActivity: new Date()
  };
  
  sessions.set(userId, session);
  return session;
}

export function updateSession(userId: string, updates: Partial<UserSession>): void {
  const session = getSession(userId) || createSession(userId);
  
  Object.assign(session, updates, { lastActivity: new Date() });
  sessions.set(userId, session);
}

export function deleteSession(userId: string): void {
  sessions.delete(userId);
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = new Date();
  for (const [userId, session] of sessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > SESSION_TIMEOUT) {
      sessions.delete(userId);
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

