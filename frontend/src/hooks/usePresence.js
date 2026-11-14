import { useState, useEffect, useRef } from 'react';
import { presenceApi } from '../services/api';
import {
  subscribeToPresence,
  isSocketConnected,
  connectSocket,
  addConnectionListener
} from '../services/socket';

export function usePresence(token) {
  // Map of userId -> { online: boolean, lastSeenAt: string | null }
  const [presenceMap, setPresenceMap] = useState({});
  const presenceSubRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    // 1. Fetch initial online snapshot from REST
    presenceApi
      .getOnlineUsers()
      .then((data) => {
        if (!isMounted) return;
        const initialMap = {};
        Object.keys(data).forEach((id) => {
          initialMap[id] = { online: true, lastSeenAt: null };
        });
        setPresenceMap(initialMap);
      })
      .catch((err) => {
        console.error('Failed to fetch presence snapshot:', err);
      });

    // 2. Subscribe to STOMP /topic/presence
    const setupPresenceSub = () => {
      if (presenceSubRef.current) {
        try {
          presenceSubRef.current.unsubscribe();
        } catch (e) {}
        presenceSubRef.current = null;
      }

      const sub = subscribeToPresence((event) => {
        if (!event || !event.userId) return;

        setPresenceMap((prev) => ({
          ...prev,
          [event.userId]: {
            online: event.online,
            lastSeenAt: event.lastSeenAt
          }
        }));
      });

      presenceSubRef.current = sub;
    };

    // Listen for socket connected events
    const removeListener = addConnectionListener((status) => {
      if (status === 'connected') {
        setupPresenceSub();
      }
    });

    if (isSocketConnected()) {
      setupPresenceSub();
    } else {
      connectSocket(token);
    }

    return () => {
      isMounted = false;
      removeListener();
      if (presenceSubRef.current) {
        try {
          presenceSubRef.current.unsubscribe();
        } catch (e) {}
        presenceSubRef.current = null;
      }
    };
  }, [token]);

  return {
    presenceMap,
    isUserOnline: (userId) => Boolean(presenceMap[userId]?.online),
    getUserLastSeen: (userId) => presenceMap[userId]?.lastSeenAt
  };
}

