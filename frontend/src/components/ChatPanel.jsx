import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { messageApi, uploadApi } from '../services/api';
import { getAvatarColor, getInitials } from '../utils/avatar';
import {
  formatMessageTime,
  formatDateSeparator,
  isDifferentDay,
  shouldGroupMessages
} from '../utils/date';
import {
  MessageSquare,
  Hash,
  Info,
  ArrowLeft,
  Send,
  CheckCheck,
  Check,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  Loader2,
  Paperclip,
  Trash2,
  Copy,
  Search,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import './ChatPanel.css';

export default function ChatPanel({
  room,
  onToggleInfo,
  isInfoOpen,
  onBackClick,
  presenceMap = {}
}) {
  const { user, token } = useAuth();
  const [inputText, setInputText] = useState('');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // In-room search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const fileInputRef = useRef(null);

  const {
    messages,
    sendMessage,
    retryMessage,
    notifyTyping,
    typingUsers,
    loadOlderMessages,
    hasMore,
    isFetchingMore,
    connectionStatus,
    isLoading
  } = useChat(room?.id, user, token);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && !isFetchingMore) {
      scrollToBottom(false);
    }
  }, [room?.id, isLoading]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 150);

    if (scrollTop < 60 && hasMore && !isFetchingMore && !isLoading) {
      prevScrollHeightRef.current = scrollHeight;
      loadOlderMessages().then((loaded) => {
        if (loaded && scrollContainerRef.current) {
          const newScrollHeight = scrollContainerRef.current.scrollHeight;
          const diff = newScrollHeight - prevScrollHeightRef.current;
          scrollContainerRef.current.scrollTop = scrollTop + diff;
        }
      });
    }
  }, [hasMore, isFetchingMore, isLoading, loadOlderMessages]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    notifyTyping();

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim(), 'TEXT');
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    setTimeout(() => scrollToBottom(true), 50);
  };

  // File / Image upload handler
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !room?.id) return;

    setIsUploading(true);
    try {
      const res = await uploadApi.uploadFile(file);
      const isImg = file.type.startsWith('image/');
      const msgType = isImg ? 'IMAGE' : 'FILE';
      sendMessage(res.url, msgType);
      setTimeout(() => scrollToBottom(true), 100);
    } catch (err) {
      console.error('Failed to upload file:', err);
      alert('Failed to upload file. Limit is 10MB.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await messageApi.deleteMessage(room.id, msgId);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Could not delete message. Only the sender or group admin can delete.');
    }
  };

  // Copy message
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  // In-room search
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !room?.id) return;

    setIsSearching(true);
    try {
      const results = await messageApi.searchMessages(room.id, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Failed to search in room:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!room) {
    return (
      <div className="chat-panel-placeholder">
        <div className="chat-placeholder-content">
          <div className="chat-placeholder-icon">
            <MessageSquare size={32} />
          </div>
          <h2 className="chat-placeholder-title">Select a room or conversation</h2>
          <p className="chat-placeholder-text">
            Choose a topic room (DSA Grind, Java Core, HR Prep) or message a peer directly to begin discussing interview questions.
          </p>
        </div>
      </div>
    );
  }

  const isGroup = room.type === 'GROUP';
  const avatarColor = getAvatarColor(room.name);
  const initials = getInitials(room.name);

  let subtitle = '';
  let isOnline = false;

  if (isGroup) {
    const members = room.members || [];
    const onlineCount = members.filter((m) => presenceMap[m.userId]?.online).length;
    subtitle = onlineCount > 0 ? `${onlineCount} online` : `${members.length || 1} members`;
    isOnline = onlineCount > 0;
  } else {
    const otherMember = (room.members || []).find((m) => m.userId !== user?.id);
    const presenceInfo = otherMember ? presenceMap[otherMember.userId] : null;
    isOnline = Boolean(presenceInfo?.online);

    if (isOnline) {
      subtitle = 'Online';
    } else if (presenceInfo?.lastSeenAt) {
      const lastSeenDate = new Date(presenceInfo.lastSeenAt);
      const minutesAgo = Math.round((Date.now() - lastSeenDate.getTime()) / 60000);
      if (minutesAgo < 1) {
        subtitle = 'Last seen just now';
      } else if (minutesAgo < 60) {
        subtitle = `Last seen ${minutesAgo}m ago`;
      } else {
        subtitle = `Last seen today at ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    } else {
      subtitle = 'Offline';
    }
  }

  return (
    <div className="chat-panel-container">
      {connectionStatus === 'reconnecting' && (
        <div className="reconnecting-banner" role="status">
          <RefreshCw size={13} className="reconnecting-spinner" />
          <span>Reconnecting to campus chat server...</span>
        </div>
      )}

      {/* Header */}
      <header className="chat-panel-header">
        <div className="chat-header-left">
          <button
            type="button"
            className="mobile-back-btn"
            onClick={onBackClick}
            aria-label="Back to conversations"
          >
            <ArrowLeft size={18} />
          </button>

          <div
            className="chat-header-avatar"
            style={{ backgroundColor: avatarColor }}
          >
            {isGroup ? <Hash size={16} /> : initials}
          </div>

          <div className="chat-header-meta">
            <div className="chat-header-title-row">
              <span className="chat-header-name">{room.name}</span>
              <span className="chat-header-badge">{isGroup ? 'Group' : 'Direct'}</span>
            </div>
            <span className="chat-header-sub">
              <span className={`presence-dot ${isOnline ? 'online' : 'offline'}`}></span>
              <span>{subtitle}</span>
            </span>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className={`header-icon-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen((prev) => !prev)}
            title="Search in room"
            aria-label="Search messages"
          >
            <Search size={17} />
          </button>

          {isGroup && (
            <button
              type="button"
              className={`header-icon-btn ${isInfoOpen ? 'active' : ''}`}
              onClick={onToggleInfo}
              title="Room Info & Members"
              aria-label="Room Info"
            >
              <Info size={18} />
            </button>
          )}
        </div>
      </header>

      {/* In-Room Search Bar */}
      {isSearchOpen && (
        <div className="inroom-search-bar">
          <form className="inroom-search-form" onSubmit={handleSearchSubmit}>
            <Search size={14} className="inroom-search-icon" />
            <input
              type="text"
              className="inroom-search-input"
              placeholder="Search in this conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="inroom-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <X size={13} />
              </button>
            )}
          </form>

          {searchResults.length > 0 && (
            <div className="inroom-search-results">
              <div className="inroom-results-header">
                {searchResults.length} match{searchResults.length > 1 ? 'es' : ''} found:
              </div>
              {searchResults.map((res) => (
                <div key={res.id} className="inroom-result-item">
                  <span className="inroom-result-sender">@{res.senderUsername}:</span>
                  <span className="inroom-result-content">{res.content}</span>
                  <span className="inroom-result-time">{formatMessageTime(res.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages List with Infinite Scroll */}
      <div
        ref={scrollContainerRef}
        className="chat-messages-container"
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
      >
        {isFetchingMore && (
          <div className="infinite-scroll-loading">
            <Loader2 size={16} className="spin-icon" />
            <span>Loading older messages...</span>
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Loader2 size={18} className="spin-icon" style={{ display: 'inline-block', marginRight: '6px' }} />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-view" style={{ padding: '32px' }}>
            <p className="chat-empty-text">
              {isGroup
                ? `No messages yet in #${room.name}. Start the discussion with your classmates!`
                : `No messages yet with @${room.name}. Say hi and discuss placement prep!`}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.senderId === user?.id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateSeparator =
              index === 0 || isDifferentDay(prevMsg?.createdAt, msg.createdAt);
            const isChained = shouldGroupMessages(prevMsg, msg);
            const senderColor = getAvatarColor(msg.senderUsername);
            const senderInitials = getInitials(msg.senderUsername);

            return (
              <React.Fragment key={msg.id || msg.clientMsgId || index}>
                {showDateSeparator && (
                  <div className="date-separator">
                    <span className="date-separator-pill">
                      {formatDateSeparator(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div className={`message-group ${isChained ? 'chained' : ''}`}>
                  <div className={`chat-message-row ${isOwn ? 'own' : ''}`}>
                    {!isOwn && (
                      !isChained ? (
                        <div
                          className="chat-msg-avatar"
                          style={{ backgroundColor: senderColor }}
                          title={`@${msg.senderUsername}`}
                        >
                          {senderInitials}
                        </div>
                      ) : (
                        <div className="chat-msg-avatar-placeholder" />
                      )
                    )}

                    <div className="chat-msg-body">
                      {!isOwn && !isChained && (
                        <span className="chat-msg-sender">
                          @{msg.senderUsername}
                        </span>
                      )}

                      <div
                        className={`chat-bubble ${
                          msg.deleted
                            ? 'deleted'
                            : msg.status === 'SENDING'
                            ? 'sending'
                            : msg.status === 'FAILED'
                            ? 'failed'
                            : ''
                        }`}
                      >
                        {/* Message content rendering */}
                        {msg.deleted ? (
                          <span className="deleted-msg-text">
                            <em>This message was deleted</em>
                          </span>
                        ) : msg.type === 'IMAGE' ? (
                          <div className="chat-image-attachment">
                            <img src={msg.content} alt="Attachment" loading="lazy" />
                          </div>
                        ) : msg.type === 'FILE' ? (
                          <a
                            href={msg.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chat-file-attachment"
                          >
                            <FileText size={18} />
                            <span>Download Placement Note/File</span>
                          </a>
                        ) : (
                          msg.content
                        )}

                        <span className="chat-bubble-footer">
                          <span>{formatMessageTime(msg.createdAt)}</span>

                          {isOwn && !msg.deleted && (
                            msg.status === 'SENDING' ? (
                              <Clock size={11} title="Sending..." />
                            ) : msg.status === 'FAILED' ? (
                              <button
                                type="button"
                                className="failed-retry-btn"
                                onClick={() => retryMessage(msg)}
                                title="Sending failed. Click to retry."
                              >
                                <AlertTriangle size={12} />
                                <RotateCcw size={11} />
                              </button>
                            ) : msg.status === 'SEEN' ? (
                              <CheckCheck size={13} color="var(--accent)" title="Seen" />
                            ) : msg.status === 'DELIVERED' ? (
                              <CheckCheck size={13} color="var(--text-muted)" title="Delivered" />
                            ) : (
                              <Check size={13} color="var(--text-muted)" title="Sent" />
                            )
                          )}
                        </span>

                        {/* Hover Action Bar */}
                        {!msg.deleted && typeof msg.id === 'number' && (
                          <div className="msg-hover-actions">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.content)}
                              title="Copy text"
                            >
                              <Copy size={12} />
                            </button>
                            {(isOwn || room.myRole === 'ADMIN') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                title="Delete message"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingUsers.length > 0 && (
        <div className="chat-typing-indicator" role="status">
          <span className="typing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </span>
          <span className="typing-text">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : `${typingUsers.slice(0, 2).join(', ')} are typing...`}
          </span>
        </div>
      )}

      {showScrollBottom && (
        <button
          type="button"
          className="jump-to-bottom-btn"
          onClick={() => scrollToBottom(true)}
          title="Jump to latest messages"
          aria-label="Jump to latest"
        >
          <ChevronDown size={16} />
          <span>Latest</span>
        </button>
      )}

      {/* Composer with Attachment Clip */}
      <form className="chat-composer-container" onSubmit={handleSend}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />

        <button
          type="button"
          className="chat-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Attach notes or image"
          aria-label="Attach file"
        >
          {isUploading ? <Loader2 size={16} className="spin-icon" /> : <Paperclip size={16} />}
        </button>

        <textarea
          ref={textareaRef}
          className="chat-composer-input"
          placeholder={`Message #${room.name}... (Enter to send, Shift+Enter for newline)`}
          rows={1}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />

        <button
          type="submit"
          className="chat-send-btn"
          disabled={!inputText.trim()}
          title="Send message"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
