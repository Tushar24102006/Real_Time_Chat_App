import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;
let currentToken = null;
const connectionListeners = new Set();

/**
 * Get or initialize the singleton STOMP client
 */
export function getStompClient() {
  return stompClient;
}

/**
 * Connect to STOMP over SockJS with JWT in headers
 */
export function connectSocket(token, onStatusChange) {
  if (stompClient && stompClient.active && currentToken === token) {
    if (onStatusChange) onStatusChange('connected');
    return stompClient;
  }

  currentToken = token;

  const wsEndpoint = import.meta.env.VITE_WS_URL || '/ws';

  stompClient = new Client({
    // Use SockJS fallback for compatibility with Spring Boot's .withSockJS()
    webSocketFactory: () => new SockJS(wsEndpoint),
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: (str) => {
      // Uncomment for deep STOMP debug logs:
      // console.debug('[STOMP]', str);
    },
    onConnect: (frame) => {
      // console.log('[STOMP] Connected successfully', frame);
      if (onStatusChange) onStatusChange('connected');
      connectionListeners.forEach((cb) => cb('connected'));
    },
    onStompError: (frame) => {
      console.warn('[STOMP Error]', frame.headers['message'], frame.body);
      if (onStatusChange) onStatusChange('error');
      connectionListeners.forEach((cb) => cb('error'));
    },
    onWebSocketClose: (event) => {
      // console.warn('[STOMP] WebSocket closed, attempting reconnect...', event);
      if (onStatusChange) onStatusChange('reconnecting');
      connectionListeners.forEach((cb) => cb('reconnecting'));
    },
    onDisconnect: () => {
      // console.log('[STOMP] Disconnected');
      if (onStatusChange) onStatusChange('disconnected');
      connectionListeners.forEach((cb) => cb('disconnected'));
    }
  });

  stompClient.activate();
  return stompClient;
}

/**
 * Disconnect and deactivate client
 */
export function disconnectSocket() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    currentToken = null;
  }
}

export function isSocketConnected() {
  return Boolean(stompClient && stompClient.connected);
}

/**
 * Subscribe to a specific room's message topic: /topic/room.{roomId}
 */
export function subscribeToRoom(roomId, onMessageReceived) {
  if (!stompClient || !stompClient.connected) {
    console.warn('[STOMP] Client not connected, cannot subscribe to room #' + roomId);
    return null;
  }

  const destination = `/topic/room.${roomId}`;
  try {
    const subscription = stompClient.subscribe(destination, (message) => {
      try {
        const payload = JSON.parse(message.body);
        onMessageReceived(payload);
      } catch (e) {
        console.error('[STOMP] Failed to parse message body:', e);
      }
    });
    return subscription;
  } catch (err) {
    console.warn('[STOMP] Failed to subscribe to room #' + roomId, err);
    return null;
  }
}

/**
 * Send a chat message over STOMP: destination /app/chat.send/{roomId}
 */
export function sendStompMessage(roomId, messageData) {
  if (!stompClient || !stompClient.connected) {
    throw new Error('WebSocket is not connected');
  }

  stompClient.publish({
    destination: `/app/chat.send/${roomId}`,
    body: JSON.stringify(messageData)
  });
}

/**
 * Send seen notification over STOMP: destination /app/chat.seen/{roomId}
 */
export function sendStompSeen(roomId) {
  if (!stompClient || !stompClient.connected) {
    return false;
  }

  try {
    stompClient.publish({
      destination: `/app/chat.seen/${roomId}`,
      body: JSON.stringify({})
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Send typing notification over STOMP: destination /app/chat.typing/{roomId}
 */
export function sendStompTyping(roomId, isTyping) {
  if (!stompClient || !stompClient.connected) {
    return false;
  }

  try {
    stompClient.publish({
      destination: `/app/chat.typing/${roomId}`,
      body: JSON.stringify({ typing: isTyping })
    });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Subscribe to global presence topic: /topic/presence
 */
export function subscribeToPresence(onPresenceReceived) {
  if (!stompClient || !stompClient.connected) {
    return null;
  }

  try {
    return stompClient.subscribe('/topic/presence', (message) => {
      try {
        const payload = JSON.parse(message.body);
        onPresenceReceived(payload);
      } catch (e) {
        console.error('[STOMP] Failed to parse presence event:', e);
      }
    });
  } catch (err) {
    console.warn('[STOMP] Failed to subscribe to presence topic:', err);
    return null;
  }
}

/**
 * Register a listener for global socket status changes
 */
export function addConnectionListener(callback) {
  connectionListeners.add(callback);
  return () => connectionListeners.delete(callback);
}

