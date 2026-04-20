import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCall } from '../contexts/CallContext';
import userService from '../services/userService';

/* ─── helper: format seconds → MM:SS ─── */
function fmt(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/* ─── inline SVG icons ─── */
const CIcons = {
  Phone: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
  ),
  PhoneOff: () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
  ),
  Video: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
  ),
  VideoOff: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
  ),
  Mic: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  ),
  MicOff: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  ),
  UserPlus: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
  ),
  Close: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
  ),
};

/* ─── Avatar helper ─── */
function CallAvatar({ username, avatar, size = 80 }) {
  const initial = username ? username.charAt(0).toUpperCase() : '?';
  return (
    <div className="call-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {avatar ? <img src={avatar} alt={username} /> : initial}
    </div>
  );
}

/* ─── Video element ─── */
function VideoFeed({ stream, muted = false, label, isLocal = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-feed ${isLocal ? 'video-feed-local' : 'video-feed-remote'}`}>
      <video ref={ref} autoPlay playsInline muted={muted} />
      {label && <span className="video-label">{label}</span>}
    </div>
  );
}

/* ─── Add People Modal ─── */
function AddPeopleModal({ onAdd, onClose, existingPeerIds }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await userService.searchUsers(query);
        if (data.success) {
          // Filter out users already on the call
          setResults(data.users.filter(u => !existingPeerIds.includes(u._id)));
        }
      } catch {} finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, existingPeerIds]);

  return (
    <div className="add-people-overlay" onClick={onClose}>
      <div className="add-people-modal" onClick={e => e.stopPropagation()}>
        <div className="add-people-header">
          <h3>Add People to Call</h3>
          <button className="icon-btn-call" onClick={onClose}><CIcons.Close /></button>
        </div>
        <div className="add-people-search">
          <CIcons.Search />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="add-people-results">
          {loading ? (
            <div className="add-people-loading">Searching...</div>
          ) : results.length > 0 ? (
            results.map(u => (
              <div key={u._id} className="add-people-item" onClick={() => { onAdd([u]); onClose(); }}>
                <CallAvatar username={u.username} avatar={u.avatar} size={36} />
                <div className="add-people-info">
                  <span className="add-people-name">{u.username}</span>
                  <span className="add-people-email">{u.email}</span>
                </div>
                <span className="add-people-btn">+ Add</span>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div className="add-people-empty">No users found</div>
          ) : (
            <div className="add-people-empty">Type at least 2 characters to search</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN CALL UI
   ═══════════════════════════════════════════ */
export default function CallUI() {
  const {
    callState, callType, caller, callDuration,
    localStream, remoteStreams, isMuted, isCameraOff,
    isGroupCall, peerUsers, peerMediaState, callParticipants,
    acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCallType, addToCall,
  } = useCall();

  const [minimize, setMinimize] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);

  // Collect all peer IDs already on the call (for filtering search results)
  const existingPeerIds = [...Array.from(peerUsers.keys()), ...callParticipants];

  // Don't render if idle
  if (callState === 'idle') return null;

  /* ───── INCOMING CALL ───── */
  if (callState === 'ringing') {
    return (
      <div className="call-overlay call-incoming" id="incoming-call">
        {/* Pulsing rings */}
        <div className="call-pulse-rings">
          <span className="pulse-ring ring-1" />
          <span className="pulse-ring ring-2" />
          <span className="pulse-ring ring-3" />
        </div>

        <div className="call-incoming-content">
          <CallAvatar username={caller?.username} avatar={caller?.avatar} size={100} />
          <h2 className="call-user-name">{caller?.username || 'Unknown'}</h2>
          <p className="call-status-text">
            {isGroupCall ? 'Group ' : ''}
            {callType === 'video' ? '📹 Video' : '🔊 Audio'} Call
          </p>

          <div className="call-incoming-actions">
            <button className="call-action-btn reject" onClick={rejectCall} id="reject-call-btn" title="Decline">
              <CIcons.PhoneOff />
            </button>
            <button className="call-action-btn accept" onClick={acceptCall} id="accept-call-btn" title="Accept">
              <CIcons.Phone />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── OUTGOING CALL (ringing other side) ───── */
  if (callState === 'outgoing') {
    const firstPeer = Array.from(peerUsers.values())[0];
    return (
      <div className="call-overlay call-outgoing" id="outgoing-call">
        <div className="call-outgoing-content">
          <div className="call-ringing-indicator">
            <CallAvatar username={firstPeer?.username} avatar={firstPeer?.avatar} size={110} />
            <div className="call-ringing-pulse" />
          </div>

          <h2 className="call-user-name">{firstPeer?.username || 'Calling...'}</h2>
          <p className="call-status-text call-status-ringing">
            {isGroupCall ? 'Starting group call...' : 'Ringing...'}
          </p>

          <div className="call-outgoing-actions">
            <button className="call-action-btn reject" onClick={endCall} id="cancel-call-btn" title="Cancel">
              <CIcons.PhoneOff />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───── ACTIVE CALL ───── */
  const remoteEntries = Array.from(remoteStreams.entries());
  const isVideo = callType === 'video';

  /* Minimized floating bubble */
  if (minimize) {
    return (
      <div className="call-minimized" onClick={() => setMinimize(false)} id="call-minimized">
        <div className="call-minimized-pulse" />
        <span className="call-minimized-timer">{fmt(callDuration)}</span>
        <span className="call-minimized-type">{isVideo ? '📹' : '🔊'}</span>
      </div>
    );
  }

  return (
    <div className={`call-overlay call-active ${isVideo ? 'call-video' : 'call-audio'}`} id="active-call">
      {/* Minimize button */}
      <button className="call-minimize-btn" onClick={() => setMinimize(true)} title="Minimize">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      {/* ── VIDEO CALL ── */}
      {isVideo ? (
        <div className={`call-video-grid grid-${Math.min(remoteEntries.length + 1, 4)}`}>
          {/* Remote streams */}
          {remoteEntries.map(([peerId, stream]) => {
            const peerInfo = peerUsers.get(peerId);
            const mediaState = peerMediaState.get(peerId);
            return (
              <div key={peerId} className="call-video-tile">
                {mediaState?.video === false ? (
                  <div className="call-video-placeholder">
                    <CallAvatar username={peerInfo?.username} avatar={peerInfo?.avatar} size={80} />
                    <span>{peerInfo?.username || 'Peer'}</span>
                  </div>
                ) : (
                  <VideoFeed stream={stream} label={peerInfo?.username} />
                )}
                {mediaState?.audio === false && <span className="video-muted-badge">🔇</span>}
              </div>
            );
          })}

          {/* Local (self) PiP */}
          {localStream && (
            <div className={`call-video-tile ${remoteEntries.length > 0 ? 'call-self-pip' : ''}`}>
              {isCameraOff ? (
                <div className="call-video-placeholder">
                  <CallAvatar username="You" size={60} />
                  <span>Camera Off</span>
                </div>
              ) : (
                <VideoFeed stream={localStream} muted isLocal label="You" />
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── AUDIO CALL ── */
        <div className="call-audio-display">
          <div className="call-audio-grid">
            {remoteEntries.map(([peerId]) => {
              const peerInfo = peerUsers.get(peerId);
              const mediaState = peerMediaState.get(peerId);
              return (
                <div key={peerId} className="call-audio-participant">
                  <CallAvatar username={peerInfo?.username} avatar={peerInfo?.avatar} size={isGroupCall ? 70 : 100} />
                  <span className="call-audio-name">{peerInfo?.username || 'Peer'}</span>
                  {mediaState?.audio === false && <span className="call-audio-muted">Muted</span>}
                </div>
              );
            })}
            {/* If no remote streams yet, show first peer */}
            {remoteEntries.length === 0 && (
              <div className="call-audio-participant">
                <CallAvatar username={Array.from(peerUsers.values())[0]?.username} avatar={Array.from(peerUsers.values())[0]?.avatar} size={100} />
                <span className="call-audio-name">{Array.from(peerUsers.values())[0]?.username || '...'}</span>
              </div>
            )}
          </div>
          <div className="call-timer">{fmt(callDuration)}</div>
        </div>
      )}

      {/* ── CONTROL BAR ── */}
      <div className="call-controls">
        <button
          className={`call-control-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          id="toggle-mute-btn"
        >
          {isMuted ? <CIcons.MicOff /> : <CIcons.Mic />}
          <span className="call-control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          className={`call-control-btn ${isCameraOff ? 'active' : ''}`}
          onClick={toggleCamera}
          title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          id="toggle-camera-btn"
          style={{ display: isVideo ? 'flex' : 'none' }}
        >
          {isCameraOff ? <CIcons.VideoOff /> : <CIcons.Video />}
          <span className="call-control-label">{isCameraOff ? 'Camera On' : 'Camera Off'}</span>
        </button>

        <button
          className="call-control-btn"
          onClick={switchCallType}
          title={isVideo ? 'Switch to Audio' : 'Switch to Video'}
          id="switch-call-type-btn"
        >
          {isVideo ? <CIcons.Phone /> : <CIcons.Video />}
          <span className="call-control-label">{isVideo ? 'Audio' : 'Video'}</span>
        </button>

        {/* Add People button */}
        <button
          className="call-control-btn"
          onClick={() => setShowAddPeople(true)}
          title="Add People"
          id="add-people-btn"
        >
          <CIcons.UserPlus />
          <span className="call-control-label">Add</span>
        </button>

        <button
          className="call-control-btn end"
          onClick={endCall}
          title="End Call"
          id="end-call-btn"
        >
          <CIcons.PhoneOff />
          <span className="call-control-label">End</span>
        </button>
      </div>

      {/* Timer overlay for video calls */}
      {isVideo && <div className="call-video-timer">{fmt(callDuration)}</div>}

      {/* Add People Modal */}
      {showAddPeople && (
        <AddPeopleModal
          onAdd={addToCall}
          onClose={() => setShowAddPeople(false)}
          existingPeerIds={existingPeerIds}
        />
      )}
    </div>
  );
}
