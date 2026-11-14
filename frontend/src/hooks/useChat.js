import { useState, useEffect, useCallback, useRef } from 'react';
import { messageApi, roomApi } from '../services/api';
import {
  connectSocket,
  subscribeToRoom,
  sendStompMessage,
  sendStompSeen,
  sendStompTyping,
  addConnectionListener,
  isSocketConnected
} from '../services/socket';

const PAGE_SIZE = 25;

export function useChat(roomId, currentUser, token) {
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(
    isSocketConnected() ? 'connected' : 'disconnected'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState('');

  // Typing state: Set of usernames currently typing in this room
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutMap = useRef(new Map());
  const myTypingTimerRef = useRef(null);

  const subscriptionRef = useRef(null);
  const markReadTimeoutRef = useRef(null);

  // 1. Listen for global connection status updates
  useEffect(() => {
    const removeListener = addConnectionListener((status) => {
      setConnectionStatus(status);
    });

    if (token) {
      connectSocket(token, (status) => setConnectionStatus(status));
    }

    return () => removeListener();
  }, [token]);

  // Mark room as read helper
  const triggerMarkAsRead = useCallback(() => {
    if (!roomId) return;
    if (markReadTimeoutRef.current) clearTimeout(markReadTimeoutRef.current);

    markReadTimeoutRef.current = setTimeout(() => {
      if (isSocketConnected()) {
        sendStompSeen(roomId);
      }
      roomApi.markAsRead(roomId).catch(() => {});
    }, 300);
  }, [roomId]);

  // 2. Fetch initial messages & subscribe to room topic
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setHasMore(false);
      setCurrentPage(0);
      setTypingUsers(new Set());
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError('');
    setCurrentPage(0);
    setHasMore(true);
    setTypingUsers(new Set());

    // Fetch initial message page (newest 25)
    messageApi
      .getMessages(roomId, 0, PAGE_SIZE)
      .then((data) => {
        if (!isMounted) return;
        const items = data.content || [];
        setMessages(items.slice().reverse());
        setHasMore(!data.last && data.totalPages > 1);
        setCurrentPage(0);
        triggerMarkAsRead();
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load room messages:', err);
        setError('Failed to load message history.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Subscribe to STOMP WebSocket topic /topic/room.{roomId}
    const setupSubscription = () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      const sub = subscribeToRoom(roomId, (payload) => {
        // Handle Typing indicator events
        if (payload.typing !== undefined && payload.username) {
          if (payload.userId === currentUser.id) return; // Ignore own typing echoes

          const username = payload.username;
          if (payload.typing) {
            setTypingUsers((prev) => new Set(prev).add(username));

            // Auto-clear after 3 seconds if no follow-up ping
            if (typingTimeoutMap.current.has(username)) {
              clearTimeout(typingTimeoutMap.current.get(username));
            }
            const timer = setTimeout(() => {
              setTypingUsers((prev) => {
                const next = new Set(prev);
                next.delete(username);
                return next;
              });
              typingTimeoutMap.current.delete(username);
            }, 3000);
            typingTimeoutMap.current.set(username, timer);
          } else {
            setTypingUsers((prev) => {
              const next = new Set(prev);
              next.delete(username);
              return next;
            });
            if (typingTimeoutMap.current.has(username)) {
              clearTimeout(typingTimeoutMap.current.get(username));
              typingTimeoutMap.current.delete(username);
            }
          }
          return;
        }

        // Handle message status updates (e.g. SEEN / DELIVERED)
        if (payload.readerId !== undefined && payload.lastReadMessageId !== undefined) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (
                msg.senderId === currentUser.id &&
                msg.id <= payload.lastReadMessageId &&
                msg.status !== 'SEEN'
              ) {
                return { ...msg, status: payload.status || 'SEEN' };
              }
              return msg;
            })
          );
          return;
        }

        // Handle new chat message
        const newMsg = payload;
        setMessages((prev) => {
          if (newMsg.clientMsgId) {
            const optIndex = prev.findIndex((m) => m.clientMsgId === newMsg.clientMsgId);
            if (optIndex !== -1) {
              const updated = [...prev];
              updated[optIndex] = newMsg;
              return updated;
            }
          }

          const exists = prev.some((m) => m.id === newMsg.id);
          if (exists) {
            return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
          }

          return [...prev, newMsg];
        });

        if (newMsg.senderId !== currentUser.id) {
          triggerMarkAsRead();
        }
      });

      subscriptionRef.current = sub;
    };

    if (isSocketConnected()) {
      setupSubscription();
    } else if (token) {
      connectSocket(token, (status) => {
        if (status === 'connected') {
          setupSubscription();
        }
      });
    }

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
      typingTimeoutMap.current.forEach((t) => clearTimeout(t));
      typingTimeoutMap.current.clear();
    };
  }, [roomId, token, triggerMarkAsRead, currentUser.id]);

  // 3. Emit Typing event (debounced)
  const notifyTyping = useCallback(() => {
    if (!roomId) return;

    if (!myTypingTimerRef.current) {
      sendStompTyping(roomId, true);
    } else {
      clearTimeout(myTypingTimerRef.current);
    }

    myTypingTimerRef.current = setTimeout(() => {
      sendStompTyping(roomId, false);
      myTypingTimerRef.current = null;
    }, 2000);
  }, [roomId]);

  // 4. Infinite scroll upward: load next older page of messages
  const loadOlderMessages = useCallback(async () => {
    if (isLoading || isFetchingMore || !hasMore || !roomId) {
      return false;
    }

    setIsFetchingMore(true);
    const nextPage = currentPage + 1;

    try {
      const data = await messageApi.getMessages(roomId, nextPage, PAGE_SIZE);
      const olderItems = (data.content || []).slice().reverse();

      if (olderItems.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlder = olderItems.filter((m) => !existingIds.has(m.id));
          return [...uniqueOlder, ...prev];
        });
      }

      setCurrentPage(nextPage);
      setHasMore(!data.last && nextPage + 1 < data.totalPages);
      return true;
    } catch (err) {
      console.error('Failed to load older messages:', err);
      return false;
    } finally {
      setIsFetchingMore(false);
    }
  }, [isLoading, isFetchingMore, hasMore, roomId, currentPage]);

  // 5. Send message with optimistic update & fallback
  const sendMessage = useCallback(
    async (content, type = 'TEXT') => {
      if (!roomId || !content.trim()) return;

      // Clear typing indicator immediately on send
      if (myTypingTimerRef.current) {
        clearTimeout(myTypingTimerRef.current);
        myTypingTimerRef.current = null;
        sendStompTyping(roomId, false);
      }

      const trimmedContent = content.trim();
      const clientMsgId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const optimisticMessage = {
        id: clientMsgId,
        clientMsgId,
        roomId,
        senderId: currentUser.id,
        senderUsername: currentUser.username,
        senderAvatarUrl: currentUser.avatarUrl,
        content: trimmedContent,
        type,
        status: 'SENT',
        createdAt: new Date().toISOString(),
        deleted: false
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        if (isSocketConnected()) {
          sendStompMessage(roomId, {
            content: trimmedContent,
            type,
            clientMsgId
          });
        } else {
          const res = await messageApi.sendMessage(roomId, {
            content: trimmedContent,
            type,
            clientMsgId
          });

          setMessages((prev) =>
            prev.map((m) => (m.clientMsgId === clientMsgId ? res : m))
          );
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMsgId === clientMsgId ? { ...m, status: 'FAILED' } : m
          )
        );
      }
    },
    [roomId, currentUser]
  );

  // 6. Retry failed message
  const retryMessage = useCallback(
    async (failedMsg) => {
      if (!failedMsg || !failedMsg.content) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.clientMsgId === failedMsg.clientMsgId
            ? { ...m, status: 'SENDING' }
            : m
        )
      );

      try {
        if (isSocketConnected()) {
          sendStompMessage(roomId, {
            content: failedMsg.content,
            type: failedMsg.type || 'TEXT',
            clientMsgId: failedMsg.clientMsgId
          });
        } else {
          const res = await messageApi.sendMessage(roomId, {
            content: failedMsg.content,
            type: failedMsg.type || 'TEXT',
            clientMsgId: failedMsg.clientMsgId
          });

          setMessages((prev) =>
            prev.map((m) =>
              m.clientMsgId === failedMsg.clientMsgId ? res : m
            )
          );
        }
      } catch (err) {
        console.error('Retry failed:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMsgId === failedMsg.clientMsgId
              ? { ...m, status: 'FAILED' }
              : m
          )
        );
      }
    },
    [roomId]
  );

  return {
    messages,
    sendMessage,
    retryMessage,
    notifyTyping,
    typingUsers: Array.from(typingUsers),
    loadOlderMessages,
    hasMore,
    isFetchingMore,
    isLoading,
    connectionStatus,
    error,
    triggerMarkAsRead
  };
}
