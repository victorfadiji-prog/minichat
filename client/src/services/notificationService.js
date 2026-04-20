/**
 * NotificationService
 * Handles browser notification permissions, showing desktop alerts, and playing sounds.
 */

class NotificationService {
  constructor() {
    this.messageSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    this.callSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3');
    this.callSound.loop = true;
    this.isSupported = 'Notification' in window;
    this.defaultCallSource = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3';
  }

  /**
   * Update the call ringtone source
   * @param {string} url — full URL to audio file
   */
  setCallRingtone(url) {
    const source = url || this.defaultCallSource;
    if (this.callSound.src !== source) {
      this.callSound.pause();
      this.callSound.src = source;
      this.callSound.load();
    }
  }

  /**
   * Request permission for browser notifications
   */
  async requestPermission() {
    if (!this.isSupported) return 'unsupported';
    
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  /**
   * Get current permission status
   */
  get permissionStatus() {
    return this.isSupported ? Notification.permission : 'unsupported';
  }

  /**
   * Play message arrival sound
   */
  playMessagePing() {
    this.messageSound.currentTime = 0;
    this.messageSound.play().catch(e => console.warn('Sound play failed:', e));
  }

  /**
   * Start playing call ringtone
   */
  playRingtone() {
    this.callSound.currentTime = 0;
    this.callSound.play().catch(e => console.warn('Ringtone play failed:', e));
  }

  /**
   * Stop any playing ringtone
   */
  stopRingtone() {
    this.callSound.pause();
    this.callSound.currentTime = 0;
  }

  /**
   * Show a desktop notification
   */
  notify({ title, body, icon, tag, onClick }) {
    if (!this.isSupported || Notification.permission !== 'granted') return;

    const options = {
      body,
      icon: icon || '/favicon.ico',
      tag: tag || 'minichat-notification',
      renotify: true,
      silent: true, // We handle sound ourselves
    };

    const n = new Notification(title, options);
    if (onClick) {
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        onClick(n);
        n.close();
      };
    }
    
    // Auto close after 5 seconds
    setTimeout(() => n.close(), 5000);
  }

  /**
   * Specific helper for new message
   */
  notifyMessage(message, conversationName, onClick) {
    const sender = typeof message.sender === 'object' ? message.sender.username : 'Someone';
    this.notify({
      title: conversationName || `New Message from ${sender}`,
      body: message.content || `[${message.type}]`,
      tag: `msg-${message.conversationId}`,
      onClick
    });
  }

  /**
   * Specific helper for incoming call
   */
  notifyCall(caller, type, onClick) {
    this.notify({
      title: `Incoming ${type} Call`,
      body: `${caller.username} is calling you...`,
      tag: 'incoming-call',
      onClick
    });
  }
}

export default new NotificationService();
