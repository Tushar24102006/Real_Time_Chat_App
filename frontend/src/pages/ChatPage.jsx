import React, { useState, useEffect, useCallback } from 'react';
import { roomApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { usePresence } from '../hooks/usePresence';
import LeftRail from '../components/LeftRail';
import ConversationList from '../components/ConversationList';
import ChatPanel from '../components/ChatPanel';
import GroupInfoPanel from '../components/GroupInfoPanel';
import CreateGroupModal from '../components/CreateGroupModal';
import DirectMessageModal from '../components/DirectMessageModal';
import './ChatPage.css';

export default function ChatPage() {
  const { token } = useAuth();
  const { presenceMap } = usePresence(token);

  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Panels
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isDirectMessageOpen, setIsDirectMessageOpen] = useState(false);

  // Mobile View Toggle: 'list' | 'chat'
  const [mobileView, setMobileView] = useState('list');

  // Load user's rooms
  const loadRooms = useCallback(async (selectId = null) => {
    try {
      const data = await roomApi.getMyRooms();
      setRooms(data);

      if (data.length > 0) {
        const targetId = selectId || selectedRoomId || data[0].id;
        setSelectedRoomId(targetId);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Load details whenever selected room changes
  useEffect(() => {
    if (!selectedRoomId) {
      setSelectedRoomDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        const details = await roomApi.getRoomDetails(selectedRoomId);
        setSelectedRoomDetails(details);

        // Clear local unread badge count for this room immediately
        setRooms((prev) =>
          prev.map((r) => (r.id === selectedRoomId ? { ...r, unreadCount: 0 } : r))
        );
      } catch (err) {
        console.error('Failed to fetch room details:', err);
      }
    };

    fetchDetails();
  }, [selectedRoomId]);

  // Keyboard shortcuts: Cmd/Ctrl+K opens Direct Message search, Esc closes panels
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsDirectMessageOpen(true);
      } else if (e.key === 'Escape') {
        setIsCreateGroupOpen(false);
        setIsDirectMessageOpen(false);
        setIsInfoOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    setMobileView('chat');
  };

  const handleGroupCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoomId(newRoom.id);
    setSelectedRoomDetails(newRoom);
    setMobileView('chat');
  };

  const handleRoomSelected = (room) => {
    setRooms((prev) => {
      const exists = prev.some((r) => r.id === room.id);
      return exists ? prev : [room, ...prev];
    });
    setSelectedRoomId(room.id);
    setSelectedRoomDetails(room);
    setMobileView('chat');
  };

  const handleRoomUpdated = (updatedRoom) => {
    setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    setSelectedRoomDetails(updatedRoom);
  };

  const handleLeaveGroup = (roomId) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setSelectedRoomId(null);
    setSelectedRoomDetails(null);
    setIsInfoOpen(false);
    setMobileView('list');
  };

  if (isLoading) {
    return (
      <div className="chat-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-meta)' }}>
          Connecting to PrepPulse placement rooms...
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-layout mobile-view-${mobileView}`}>
      {/* 64px Left Rail */}
      <LeftRail
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setMobileView('list');
        }}
      />

      {/* 320px Conversation Sidebar */}
      <ConversationList
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={handleSelectRoom}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        onOpenDirectMessage={() => setIsDirectMessageOpen(true)}
        presenceMap={presenceMap}
      />

      {/* Flexible Center Chat Panel */}
      <ChatPanel
        room={selectedRoomDetails}
        onToggleInfo={() => setIsInfoOpen((prev) => !prev)}
        isInfoOpen={isInfoOpen}
        onBackClick={() => setMobileView('list')}
        presenceMap={presenceMap}
      />

      {/* 320px Slide-in Group Info Panel */}
      {isInfoOpen && selectedRoomDetails?.type === 'GROUP' && (
        <GroupInfoPanel
          room={selectedRoomDetails}
          isOpen={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          onRoomUpdated={handleRoomUpdated}
          onLeaveGroup={handleLeaveGroup}
        />
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      <DirectMessageModal
        isOpen={isDirectMessageOpen}
        onClose={() => setIsDirectMessageOpen(false)}
        onRoomSelected={handleRoomSelected}
      />
    </div>
  );
}
