import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import callService from '../services/callService';
import notificationService from '../services/notificationService';

const CallContext = createContext(null);

/*  ICE servers — free Google STUN.  Add a TURN server for production. */
const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

/**
 * CallProvider — manages the full WebRTC lifecycle for
 * 1-on-1 AND group (mesh) calls.
 *
 * State machine:  idle → outgoing|ringing → active → idle
 */
export function CallProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  /* ───── call-level state ───── */
  const [callState, setCallState] = useState('idle');          // idle | outgoing | ringing | active
  const [callType, setCallType] = useState('audio');           // audio | video
  const [callId, setCallId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [caller, setCaller] = useState(null);                  // who initiated (for incoming)
  const [callParticipants, setCallParticipants] = useState([]); // user IDs[]
  const [callDuration, setCallDuration] = useState(0);

  /* ───── media state ───── */
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // peerId → MediaStream
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [peerMediaState, setPeerMediaState] = useState(new Map()); // peerId → { audio, video }

  /* ───── peer info for UI (username/avatar) ───── */
  const [peerUsers, setPeerUsers] = useState(new Map());       // peerId → { username, avatar }

  /* ───── refs ───── */
  const peerConnections = useRef(new Map());   // peerId → RTCPeerConnection
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef('idle');
  const callStartTimeRef = useRef(null);
  const pendingCandidates = useRef(new Map()); // peerId → ICECandidate[]
  const callParticipantsRef = useRef([]);
  const isGroupCallRef = useRef(false);

  /* keep refs in sync */
  useEffect(() => { callIdRef.current = callId; }, [callId]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callParticipantsRef.current = callParticipants; }, [callParticipants]);
  useEffect(() => { isGroupCallRef.current = isGroupCall; }, [isGroupCall]);

  /* ─────────────────────────────────────────────
     HELPERS
     ───────────────────────────────────────────── */

  /** Acquire local media */
  const getLocalMedia = useCallback(async (type) => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('getUserMedia error:', err);
      throw err;
    }
  }, []);

  /** Stop all local tracks */
  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  /** Create an RTCPeerConnection for a given peer */
  const createPeerConnection = useCallback((peerId, peerSocketId) => {
    if (peerConnections.current.has(peerId)) {
      // Already have a connection to this peer — return it
      return peerConnections.current.get(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE candidates → send to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:signal', {
          to: peerSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
          callId: callIdRef.current,
        });
      }
    };

    // Remote track arrived
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.set(peerId, remoteStream);
        return updated;
      });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`ICE state for ${peerId}: ${pc.iceConnectionState}`);
      }
    };

    peerConnections.current.set(peerId, pc);

    // Flush any buffered ICE candidates
    if (pendingCandidates.current.has(peerId)) {
      pendingCandidates.current.get(peerId).forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
      pendingCandidates.current.delete(peerId);
    }

    return pc;
  }, [socket]);

  /** Tear down ALL peer connections */
  const closeAllPeers = useCallback(() => {
    peerConnections.current.forEach(pc => { try { pc.close(); } catch {} });
    peerConnections.current.clear();
    pendingCandidates.current.clear();
    setRemoteStreams(new Map());
    setPeerMediaState(new Map());
    setPeerUsers(new Map());
  }, []);

  /** Start a duration timer from NOW */
  const startTimer = useCallback(() => {
    callStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCallDuration(0);
  }, []);

  /** Full cleanup → back to idle */
  const resetCall = useCallback(() => {
    closeAllPeers();
    stopLocalMedia();
    stopTimer();
    setCallState('idle');
    setCallType('audio');
    setCallId(null);
    setConversationId(null);
    setIsGroupCall(false);
    setCaller(null);
    setCallParticipants([]);
    setIsMuted(false);
    setIsCameraOff(false);
    notificationService.stopRingtone();
  }, [closeAllPeers, stopLocalMedia, stopTimer]);

  /* ─────────────────────────────────────────────
     PUBLIC ACTIONS
     ───────────────────────────────────────────── */

  /**
   * Initiate a call.
   * @param {string[]} participantIds — other user IDs to call
   * @param {'audio'|'video'} type
   * @param {string} convId — the conversation id
   * @param {boolean} group — true for group calls
   * @param {object} targetUser — { _id, username, avatar } for 1-on-1 display
   */
  const initiateCall = useCallback(async (participantIds, type, convId, group = false, targetUser = null) => {
    if (callState !== 'idle') return;

    try {
      // 1. Acquire media
      await getLocalMedia(type);

      // 2. Create DB record
      const { call } = await callService.createCall({
        participants: participantIds,
        type,
        conversation: convId,
        isGroup: group,
      });

      const id = call._id;
      setCallId(id);
      setCallType(type);
      setConversationId(convId);
      setIsGroupCall(group);
      setCallParticipants(participantIds);
      setCallState('outgoing');

      if (targetUser) {
        setPeerUsers(prev => { const m = new Map(prev); m.set(targetUser._id, targetUser); return m; });
      }

      // 3. Signal other participants via socket
      socket.emit('call:initiate', {
        participants: participantIds,
        type,
        conversationId: convId,
        isGroup: group,
        callId: id,
      });

      // For group calls, join immediately
      if (group) {
        socket.emit('call:join', { conversationId: convId, callId: id });
      }
    } catch (err) {
      console.error('Failed to initiate call:', err);
      resetCall();
    }
  }, [callState, socket, getLocalMedia, resetCall]);

  /** Accept an incoming call */
  const acceptCall = useCallback(async () => {
    if (callState !== 'ringing') return;

    try {
      await getLocalMedia(callType);

      setCallState('active');
      startTimer();
      notificationService.stopRingtone();

      if (isGroupCall) {
        // Join the call room
        socket.emit('call:join', { conversationId, callId });
      } else {
        // Tell the caller we accepted
        socket.emit('call:accept', { callerId: caller._id, callId });
      }
    } catch (err) {
      console.error('Failed to accept call:', err);
      resetCall();
    }
  }, [callState, callType, caller, callId, conversationId, isGroupCall, socket, getLocalMedia, startTimer, resetCall]);

  /** Reject an incoming call */
  const rejectCall = useCallback(() => {
    if (callState !== 'ringing') return;

    socket.emit('call:reject', { callerId: caller?._id, callId, reason: 'rejected' });

    // Update DB
    callService.updateCall(callId, { status: 'rejected' }).catch(() => {});

    resetCall();
  }, [callState, caller, callId, socket, resetCall]);

  /** End / leave a call */
  const endCall = useCallback(() => {
    if (callStateRef.current === 'idle') return;

    const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
    const cId = callIdRef.current;
    const parts = callParticipantsRef.current;
    const group = isGroupCallRef.current;

    socket.emit('call:end', { callId: cId, participants: parts, isGroup: group });

    // Update DB
    const status = callStateRef.current === 'active' ? 'completed' : 'missed';
    callService.updateCall(cId, { status, duration }).catch(() => {});

    resetCall();
  }, [socket, resetCall]);

  /**
   * Add users to an ongoing call (upgrades 1-on-1 → group).
   * @param {Array} users — [{ _id, username, avatar }]
   */
  const addToCall = useCallback((users) => {
    if (callStateRef.current !== 'active' || !callIdRef.current) return;

    const newIds = users.map(u => u._id);

    // Upgrade to group mode if needed
    if (!isGroupCallRef.current) {
      setIsGroupCall(true);
      // Join the call room so we can receive peer-joined events
      socket.emit('call:join', { conversationId, callId: callIdRef.current });
    }

    // Update participants list
    setCallParticipants(prev => [...prev, ...newIds]);

    // Add to peer display map
    setPeerUsers(prev => {
      const m = new Map(prev);
      users.forEach(u => m.set(u._id, u));
      return m;
    });

    // Tell server to invite them
    socket.emit('call:add-participant', {
      callId: callIdRef.current,
      newParticipants: newIds,
      type: callType,
      conversationId,
      existingParticipants: callParticipantsRef.current,
    });
  }, [socket, conversationId, callType]);

  /** Toggle microphone */
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      socket?.emit('call:toggle-media', { callId, kind: 'audio', enabled: audioTrack.enabled, participants: callParticipants });
    }
  }, [callId, callParticipants, socket]);

  /** Toggle camera */
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
      socket?.emit('call:toggle-media', { callId, kind: 'video', enabled: videoTrack.enabled, participants: callParticipants });
    }
  }, [callId, callParticipants, socket]);

  /** Switch between audio and video mid-call */
  const switchCallType = useCallback(async () => {
    if (callState !== 'active') return;

    if (callType === 'audio') {
      // Upgrade to video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(videoTrack);

        // Replace in all peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, localStreamRef.current);
          }
        });

        setLocalStream(prev => {
          // Force re-render
          return localStreamRef.current;
        });
        setCallType('video');
        setIsCameraOff(false);
      } catch (err) {
        console.error('Failed to upgrade to video:', err);
      }
    } else {
      // Downgrade to audio
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
        localStreamRef.current.removeTrack(videoTrack);

        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) pc.removeTrack(sender);
        });
      }
      setCallType('audio');
      setIsCameraOff(false);
      setLocalStream(localStreamRef.current);
    }
  }, [callState, callType]);

  /* ─────────────────────────────────────────────
     SOCKET EVENT HANDLERS
     ───────────────────────────────────────────── */

  useEffect(() => {
    if (!socket) return;

    /* ▸ Incoming call */
    const handleIncoming = ({ caller: callerInfo, type, conversationId: convId, isGroup: group, callId: id, participants }) => {
      // If already in THIS call (we added someone), ignore the echo
      if (callIdRef.current === id) return;

      if (callStateRef.current !== 'idle') {
        // Already in a different call — auto reject as busy
        socket.emit('call:reject', { callerId: callerInfo._id, callId: id, reason: 'busy' });
        return;
      }

      setCaller(callerInfo);
      setCallId(id);
      setCallType(type);
      setConversationId(convId);
      setIsGroupCall(group || false);
      setCallParticipants(participants || [callerInfo._id]);
      setCallState('ringing');

      if (user?.notificationSettings?.enabled) {
        if (user.notificationSettings.sound) {
          notificationService.playRingtone();
        }
        notificationService.notifyCall(callerInfo, type);
      }

      setPeerUsers(prev => {
        const m = new Map(prev);
        m.set(callerInfo._id, callerInfo);
        return m;
      });
    };

    /* ▸ Call accepted (1-on-1 — caller side) */
    const handleAccepted = async ({ acceptorId, callId: id, socketId: acceptorSocketId }) => {
      if (callIdRef.current !== id) return;

      setCallState('active');
      startTimer();

      // Create peer connection and send offer
      try {
        const pc = createPeerConnection(acceptorId, acceptorSocketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', {
          to: acceptorSocketId,
          signal: { type: 'offer', sdp: offer.sdp },
          callId: id,
        });
      } catch (err) {
        console.error('createOffer failed:', err);
      }
    };

    /* ▸ Call rejected */
    const handleRejected = ({ rejectorId, callId: id, reason }) => {
      if (callIdRef.current !== id) return;
      console.log(`Call rejected (${reason}) by ${rejectorId}`);
      callService.updateCall(id, { status: reason === 'busy' ? 'busy' : 'rejected' }).catch(() => {});
      resetCall();
    };

    /* ▸ Signaling (offer, answer, ICE candidate) */
    const handleSignal = async ({ from, fromSocketId, signal, callId: id }) => {
      if (callIdRef.current !== id) return;

      if (signal.type === 'candidate') {
        const pc = peerConnections.current.get(from);
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          // Buffer
          if (!pendingCandidates.current.has(from)) pendingCandidates.current.set(from, []);
          pendingCandidates.current.get(from).push(signal.candidate);
        }
        return;
      }

      if (signal.type === 'offer') {
        const pc = createPeerConnection(from, fromSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));

        // Flush buffered candidates
        if (pendingCandidates.current.has(from)) {
          for (const c of pendingCandidates.current.get(from)) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates.current.delete(from);
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('call:signal', {
          to: fromSocketId,
          signal: { type: 'answer', sdp: answer.sdp },
          callId: id,
        });
      }

      if (signal.type === 'answer') {
        const pc = peerConnections.current.get(from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));

          // Flush buffered candidates
          if (pendingCandidates.current.has(from)) {
            for (const c of pendingCandidates.current.get(from)) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            pendingCandidates.current.delete(from);
          }
        }
      }
    };

    /* ▸ Peer joined a group call */
    const handlePeerJoined = async ({ userId: peerId, username, socketId: peerSocketId, callId: id }) => {
      if (callIdRef.current !== id) return;

      setPeerUsers(prev => { const m = new Map(prev); m.set(peerId, { _id: peerId, username }); return m; });

      // Create a peer connection and send an offer
      try {
        const pc = createPeerConnection(peerId, peerSocketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', {
          to: peerSocketId,
          signal: { type: 'offer', sdp: offer.sdp },
          callId: id,
        });
      } catch (err) {
        console.error('Group peer offer failed:', err);
      }
    };

    /* ▸ Peer left a group call */
    const handlePeerLeft = ({ userId: peerId, callId: id }) => {
      if (callIdRef.current !== id) return;

      const pc = peerConnections.current.get(peerId);
      if (pc) { try { pc.close(); } catch {} peerConnections.current.delete(peerId); }

      setRemoteStreams(prev => { const m = new Map(prev); m.delete(peerId); return m; });
      setPeerUsers(prev => { const m = new Map(prev); m.delete(peerId); return m; });
    };

    /* ▸ Call ended (by other party) — always ends the call on this side */
    const handleEnded = ({ endedBy, callId: id, isGroup: endGroup }) => {
      if (callIdRef.current !== id) return;

      // For group calls, only end if we want to (peer-left handles individuals)
      // For 1-on-1 (or forced), always end
      if (endGroup && isGroupCallRef.current) {
        // In a group call, just remove the peer who left
        const pc = peerConnections.current.get(endedBy);
        if (pc) { try { pc.close(); } catch {} peerConnections.current.delete(endedBy); }
        setRemoteStreams(prev => { const m = new Map(prev); m.delete(endedBy); return m; });
        setPeerUsers(prev => { const m = new Map(prev); m.delete(endedBy); return m; });
        return;
      }

      // 1-on-1: fully end the call
      const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
      callService.updateCall(id, { status: 'completed', duration }).catch(() => {});
      resetCall();
    };

    /* ▸ Participants updated (someone added new people) */
    const handleParticipantsUpdated = ({ callId: id, newParticipants }) => {
      if (callIdRef.current !== id) return;

      // Upgrade to group if not already
      setIsGroupCall(true);
      setCallParticipants(prev => [...new Set([...prev, ...newParticipants])]);

      // Join the call room so we get peer-joined events for new members
      socket.emit('call:join', { callId: id });
    };

    /* ▸ Media toggled by peer */
    const handleMediaToggled = ({ userId: peerId, kind, enabled }) => {
      setPeerMediaState(prev => {
        const m = new Map(prev);
        const existing = m.get(peerId) || { audio: true, video: true };
        m.set(peerId, { ...existing, [kind]: enabled });
        return m;
      });
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);
    socket.on('call:signal', handleSignal);
    socket.on('call:peer-joined', handlePeerJoined);
    socket.on('call:peer-left', handlePeerLeft);
    socket.on('call:ended', handleEnded);
    socket.on('call:media-toggled', handleMediaToggled);
    socket.on('call:participants-updated', handleParticipantsUpdated);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
      socket.off('call:signal', handleSignal);
      socket.off('call:peer-joined', handlePeerJoined);
      socket.off('call:peer-left', handlePeerLeft);
      socket.off('call:ended', handleEnded);
      socket.off('call:media-toggled', handleMediaToggled);
      socket.off('call:participants-updated', handleParticipantsUpdated);
    };
  }, [socket, callState, createPeerConnection, startTimer, resetCall]);

  /* ─────────────────────────────────────────────
     CONTEXT VALUE
     ───────────────────────────────────────────── */

  const value = {
    // State
    callState,
    callType,
    callId,
    conversationId,
    isGroupCall,
    caller,
    callParticipants,
    callDuration,
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    peerMediaState,
    peerUsers,
    // Actions
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCallType,
    addToCall,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
}

export default CallContext;
