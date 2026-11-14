import React, { useState, useEffect } from 'react';
import { roomApi, userApi } from '../services/api';
import { getAvatarColor, getInitials } from '../utils/avatar';
import { X, Search, Check, Users } from 'lucide-react';
import './Modal.css';

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setError('');
    }
  }, [isOpen]);

  // Search classmates as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await userApi.searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Failed to search students:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const toggleSelectUser = (user) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group name cannot be blank');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const memberIds = selectedUsers.map((u) => u.id);
      const newRoom = await roomApi.createGroup({
        name: name.trim(),
        memberIds
      });
      onGroupCreated(newRoom);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Users size={18} className="modal-title-icon" />
            <h2 className="modal-title">Create Placement Study Group</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-field">
            <label className="modal-label" htmlFor="group-name">
              Group Name
            </label>
            <input
              id="group-name"
              type="text"
              className="modal-input"
              placeholder="e.g. System Design Mock Interviews"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="member-search">
              Invite Classmates (Optional)
            </label>
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                id="member-search"
                type="text"
                className="modal-input search-input"
                placeholder="Search by student name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Selected Chips */}
          {selectedUsers.length > 0 && (
            <div className="selected-chips-row">
              {selectedUsers.map((u) => (
                <div key={u.id} className="selected-chip">
                  <span>@{u.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectUser(u)}
                    className="chip-remove-btn"
                    aria-label={`Remove ${u.username}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Result List */}
          <div className="search-results-list">
            {isSearching ? (
              <div className="search-status">Searching student network...</div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div className="search-status">No classmates found matching &quot;{searchQuery}&quot;</div>
            ) : (
              searchResults.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <div
                    key={user.id}
                    className={`search-user-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelectUser(user)}
                  >
                    <div className="search-user-info">
                      <div
                        className="search-user-avatar"
                        style={{ backgroundColor: getAvatarColor(user.username) }}
                      >
                        {getInitials(user.username)}
                      </div>
                      <div>
                        <div className="search-user-name">@{user.username}</div>
                        <div className="search-user-email">{user.email}</div>
                      </div>
                    </div>
                    {isSelected && <Check size={16} className="selected-check" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn primary"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

