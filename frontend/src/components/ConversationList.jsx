import React from 'react';
import { getAvatarColor, getInitials } from '../utils/avatar';
import { formatMessageTime } from '../utils/date';
import {
  Search,
  Plus,
  MessageSquarePlus,
  Hash,
  X,
  Users
} from 'lucide-react';
import './ConversationList.css';

export default function ConversationList({
  rooms,
  selectedRoomId,
  onSelectRoom,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenCreateGroup,
  onOpenDirectMessage,
  presenceMap = {}
}) {
  // Filter rooms based on active tab and search query
  const filteredRooms = rooms.filter((room) => {
    // Tab filter
    if (activeTab === 'unread' && room.unreadCount === 0) {
      return false;
    }
    if (activeTab === 'groups' && room.type !== 'GROUP') {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = room.name?.toLowerCase().includes(q);
      const matchesLastMsg = room.lastMessage?.content?.toLowerCase().includes(q);
      return matchesName || matchesLastMsg;
    }

    return true;
  });

  const totalUnreadCount = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

  return (
    <aside className="conversation-sidebar" aria-label="Conversation list">
      {/* Top Header & Actions */}
      <div className="convo-header">
        <div className="convo-title-row">
          <h2 className="convo-title">Conversations</h2>
          <div className="convo-actions">
            <button
              type="button"
              className="action-icon-btn"
              onClick={onOpenDirectMessage}
              title="New Direct Message"
              aria-label="New Direct Message"
            >
              <MessageSquarePlus size={17} />
            </button>
            <button
              type="button"
              className="action-icon-btn"
              onClick={onOpenCreateGroup}
              title="Create Placement Group"
              aria-label="Create Placement Group"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="convo-search-wrapper">
          <Search size={14} className="convo-search-icon" />
          <input
            type="text"
            className="convo-search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="convo-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="convo-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`convo-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => onTabChange('all')}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'unread'}
            className={`convo-tab ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => onTabChange('unread')}
          >
            <span>Unread</span>
            {totalUnreadCount > 0 && (
              <span className="unread-pill-tab">{totalUnreadCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'groups'}
            className={`convo-tab ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => onTabChange('groups')}
          >
            Groups
          </button>
        </div>
      </div>

      {/* Room List */}
      <div className="room-list-container">
        {filteredRooms.length === 0 ? (
          <div className="empty-rooms-state">
            {searchQuery ? (
              <p>No conversations matching &quot;{searchQuery}&quot;</p>
            ) : activeTab === 'unread' ? (
              <p>You&apos;re all caught up! No unread messages.</p>
            ) : (
              <p>No conversations found. Start a study group or direct chat.</p>
            )}
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const isGroup = room.type === 'GROUP';
            const avatarColor = getAvatarColor(room.name || 'Room');
            const initials = getInitials(room.name || 'Room');
            const lastMsg = room.lastMessage;
            const lastMsgTime = lastMsg
              ? formatMessageTime(lastMsg.createdAt)
              : formatMessageTime(room.createdAt);

            return (
              <div
                key={room.id}
                className={`room-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectRoom(room.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectRoom(room.id);
                  }
                }}
              >
                {/* Avatar */}
                <div
                  className="room-avatar"
                  style={{ backgroundColor: avatarColor }}
                >
                  {isGroup ? <Hash size={16} /> : initials}
                  {!isGroup && room.targetUserId && presenceMap[room.targetUserId]?.online && (
                    <span className="room-avatar-online-dot"></span>
                  )}
                </div>

                {/* Info */}
                <div className="room-info">
                  <div className="room-row-top">
                    <span className="room-name">{room.name}</span>
                    <span className="room-time">{lastMsgTime}</span>
                  </div>

                  <div className="room-row-bottom">
                    <span className="room-preview">
                      {lastMsg ? (
                        <>
                          <span className="preview-sender">
                            {lastMsg.senderUsername}:
                          </span>{' '}
                          {lastMsg.content}
                        </>
                      ) : (
                        <span className="preview-empty">No messages yet</span>
                      )}
                    </span>

                    {room.unreadCount > 0 && (
                      <span className="unread-badge">
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

