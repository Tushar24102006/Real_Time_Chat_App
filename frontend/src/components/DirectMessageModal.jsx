import React, { useState, useEffect } from 'react';
import { roomApi, userApi } from '../services/api';
import { getAvatarColor, getInitials } from '../utils/avatar';
import { X, Search, MessageSquare } from 'lucide-react';
import './Modal.css';

export default function DirectMessageModal({ isOpen, onClose, onRoomSelected }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setError('');
    }
  }, [isOpen]);

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

  const handleSelectUser = async (targetUserId) => {
    setIsLoading(true);
    setError('');
    try {
      const room = await roomApi.getOrCreatePrivate(targetUserId);
      onRoomSelected(room);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start direct conversation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <MessageSquare size={18} className="modal-title-icon" />
            <h2 className="modal-title">New Direct Conversation</h2>
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

        <div className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="modal-field">
            <div className="search-input-wrapper">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                className="modal-input search-input"
                placeholder="Search classmate by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="search-results-list">
            {isSearching ? (
              <div className="search-status">Searching student directory...</div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div className="search-status">No students found matching &quot;{searchQuery}&quot;</div>
            ) : !searchQuery.trim() ? (
              <div className="search-status">Type to find classmates for 1-to-1 interview prep</div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="search-user-item"
                  onClick={() => handleSelectUser(user.id)}
                  style={{ cursor: isLoading ? 'wait' : 'pointer' }}
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

