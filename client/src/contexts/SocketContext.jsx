import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * SocketProvider — manages Supabase Realtime connection lifecycle.
 * Replaces Socket.io with Supabase Channels and Presence.
 */
export function SocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setConnected(false);
      return;
    }

    // 1. Initialize Realtime Channel
    const channel = supabase.channel('global_chat_room', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // 2. Handle Presence (Online/Offline)
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineIds = new Set(Object.keys(newState));
        setOnlineUsers(onlineIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👤 User joined:', key);
        setOnlineUsers((prev) => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👤 User left:', key);
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      });

    // 3. Listen for Database Changes (Messages)
    // This replaces 'message:received' socket event
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        console.log('📩 New message received via Realtime:', payload.new);
        // We can dispatch a custom event or use a callback pattern here
        const event = new CustomEvent('new_message', { detail: payload.new });
        window.dispatchEvent(event);
      }
    );

    // 4. Subscribe
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true);
        console.log('🔌 Supabase Realtime connected');
        
        // Track presence
        await channel.track({
          online_at: new Date().toISOString(),
          username: user.username,
        });
      } else {
        setConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [isAuthenticated, user]);

  const isUserOnline = useCallback(
    (userId) => onlineUsers.has(userId),
    [onlineUsers]
  );

  const value = {
    socket: channelRef.current, // Providing the channel as the 'socket' object
    connected,
    onlineUsers,
    isUserOnline,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
