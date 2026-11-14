import React, { useState } from 'react';
import { roomApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { getAvatarColor, getInitials } from '../utils/avatar';
import {
  X,
  Hash,
  Shield,
  UserMinus,
  UserPlus,
  LogOut,
  AlertCircle
} from 'lucide-react';
import './GroupInfoPanel.css';

export default function GroupInfoPanel({
  room,
  isOpen,
  onClose,
  onRoomUpdated,
  onLeaveGroup
}) {
  const { user } = useAuth();
  const [addUsername, setAddUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!isOpen || !room) return null;

  const isAdmin = room.myRole === 'ADMIN';
  const members = room.members || [];
  const avatarColor = getAvatarColor(room.name);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addUsername.trim()) return;

    setActionError('');
    setIsAdding(true);
    try {
      // Search user by username
      const foundUsers = await userApi.searchUsers(addUsername.trim());
      const targetUser = foundUsers.find(
        (u) => u.username.toLowerCase() === addUsername.trim().toLowerCase()
      ) || foundUsers[0];

      if (!targetUser) {
        setActionError(`No student found with username "${addUsername.trim()}"`);
        setIsAdding(false);
        return;
      }

      const updated = await roomApi.addMember(room.id, {
        userId: targetUser.id,
        role: 'MEMBER'
      });
      onRoomUpdated(updated);
      setAddUsername('');
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to add student');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this student from the room?')) {
      return;
    }
    setActionError('');
    try {
      await roomApi.removeMember(room.id, userId);
      // Reload room details
      const updated = await roomApi.getRoomDetails(room.id);
      onRoomUpdated(updated);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this study group?')) {
      return;
    }
    setActionError('');
    try {
      await roomApi.removeMember(room.id, user.id);
      onLeaveGroup(room.id);
      onClose();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to leave group');
    }
  };

  return (
    <aside className="group-info-sidebar" aria-label="Group Information">
      <div className="info-header">
        <h3 className="info-title">Group Details</h3>
        <button
          type="button"
          className="info-close-btn"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="info-content">
        {actionError && (
          <div className="modal-error" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <AlertCircle size={15} />
            <span>{actionError}</span>
          </div>
        )}

        {/* Hero */}
        <div className="info-hero">
          <div className="info-hero-avatar" style={{ backgroundColor: avatarColor }}>
            <Hash size={24} />
          </div>
          <h4 className="info-hero-name">{room.name}</h4>
          <span className="info-hero-meta">
            Placement Prep Room &middot; {members.length} members
          </span>
        </div>

        {/* Add Member form (Admins only) */}
        {isAdmin && (
          <div className="info-section">
            <span className="info-section-title">Add Classmate</span>
            <form onSubmit={handleAddMember} className="add-member-box">
              <div className="add-member-row">
                <input
                  type="text"
                  className="add-member-input"
                  placeholder="Student username..."
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                />
                <button
                  type="submit"
                  className="add-member-btn"
                  disabled={isAdding || !addUsername.trim()}
                >
                  <UserPlus size={14} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Members List */}
        <div className="info-section">
          <div className="info-section-title">
            <span>Members</span>
            <span>{members.length}</span>
          </div>

          <div className="member-list">
            {members.map((m) => {
              const isCurrentUser = m.userId === user?.id;
              const isMemberAdmin = m.role === 'ADMIN';

              return (
                <div key={m.id} className="member-card">
                  <div className="member-card-left">
                    <div
                      className="member-card-avatar"
                      style={{ backgroundColor: getAvatarColor(m.username) }}
                    >
                      {getInitials(m.username)}
                    </div>
                    <div className="member-card-info">
                      <span className="member-card-name">
                        @{m.username} {isCurrentUser && '(You)'}
                      </span>
                      <span className="member-card-role">
                        {isMemberAdmin ? 'ADMIN' : 'MEMBER'}
                      </span>
                    </div>
                  </div>

                  {isAdmin && !isCurrentUser && (
                    <button
                      type="button"
                      className="member-remove-btn"
                      onClick={() => handleRemoveMember(m.userId)}
                      title={`Remove @${m.username}`}
                      aria-label={`Remove @${m.username}`}
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Action */}
        <button
          type="button"
          className="info-leave-btn"
          onClick={handleLeave}
        >
          <LogOut size={16} />
          <span>Leave Group</span>
        </button>
      </div>
    </aside>
  );
}

