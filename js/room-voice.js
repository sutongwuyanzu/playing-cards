/* 夜牌馆 · 房间群聊语音（WebRTC mesh，仅房间成员广播） */
(function (w) {
  const RTC_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] };
  const MAX_RETRY_PLAY = 12000;

  function attach(room, options) {
    options = options || {};
    const button = options.button || null;
    const peers = new Map();
    const audios = new Map();
    let stream = null;
    let enabled = false;
    let muted = true;
    let starting = false;
    let destroyed = false;
    const onButtonClick = () => toggle();
    let onPageHide = null;

    function selfId() { return w.NightNet && NightNet.pid || room.pid; }
    function participants() {
      const seats = room.lobby && room.lobby.seats || [];
      return seats.map(s => s && s.kind === "human" ? s.id : null).filter(id => id && id !== selfId());
    }
    function isParticipant(id) { return participants().includes(id); }
    function updateButton() {
      if (!button) return;
      button.classList.toggle("on", enabled && !muted);
      button.textContent = !enabled ? "🎙 开启语音" : (muted ? "🔇 已静音" : "🎙 正在说话");
      button.title = !enabled ? "开启房间群聊语音" : (muted ? "取消静音" : "点击静音");
      button.setAttribute("aria-pressed", enabled && !muted ? "true" : "false");
    }
    function send(to, signal) {
      if (!destroyed) room.send({ act: "voice-signal", to, signal });
    }
    function removeAudio(id) {
      const el = audios.get(id);
      if (el) { try { el.pause(); el.srcObject = null; } catch (e) {} el.remove(); }
      audios.delete(id);
    }
    function attachAudio(id, remoteStream) {
      let el = audios.get(id);
      if (!el) {
        el = document.createElement("audio");
        el.className = "room-voice-audio";
        el.autoplay = true;
        el.playsInline = true;
        el.setAttribute("aria-label", "房间语音");
        document.body.appendChild(el);
        audios.set(id, el);
      }
      el.srcObject = remoteStream;
      const play = () => el.play().catch(() => {});
      play();
      const retryAt = Date.now() + MAX_RETRY_PLAY;
      const retry = () => { if (Date.now() < retryAt && el.paused) { play(); setTimeout(retry, 1200); } };
      setTimeout(retry, 800);
    }
    function closePeer(id) {
      const item = peers.get(id);
      if (item) { try { item.pc.close(); } catch (e) {} peers.delete(id); }
      removeAudio(id);
    }
    function createPeer(id, initiate) {
      if (destroyed || !enabled || !id || id === selfId() || !isParticipant(id)) return null;
      const old = peers.get(id);
      if (old) return old;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const item = { pc, candidates: [] };
      peers.set(id, item);
      if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream));
      else pc.addTransceiver("audio", { direction: "recvonly" });
      pc.onicecandidate = event => { if (event.candidate) send(id, { candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate }); };
      pc.ontrack = event => { if (event.streams && event.streams[0]) attachAudio(id, event.streams[0]); };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          if (pc.connectionState !== "disconnected") closePeer(id);
        }
      };
      if (initiate) {
        pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => send(id, { description: pc.localDescription })).catch(() => {});
      }
      return item;
    }
    function shouldInitiate(id) { return String(selfId()) < String(id); }
    async function handleSignal(msg) {
      if (destroyed || !enabled || msg.act !== "voice-signal" || !msg.id || msg.id === selfId()) return;
      if (msg.to && msg.to !== selfId()) return;
      if (!isParticipant(msg.id) || !msg.signal) return;
      const item = createPeer(msg.id, false);
      if (!item) return;
      const signal = msg.signal;
      try {
        if (signal.renegotiate) {
          closePeer(msg.id);
          createPeer(msg.id, shouldInitiate(msg.id));
          return;
        }
        if (signal.description) {
          const description = signal.description;
          if (description.type === "offer" && item.pc.signalingState !== "stable") return;
          await item.pc.setRemoteDescription(description);
          while (item.candidates.length) await item.pc.addIceCandidate(item.candidates.shift());
          if (description.type === "offer") {
            const answer = await item.pc.createAnswer();
            await item.pc.setLocalDescription(answer);
            send(msg.id, { description: item.pc.localDescription });
          }
        } else if (signal.candidate) {
          if (item.pc.remoteDescription) await item.pc.addIceCandidate(signal.candidate);
          else item.candidates.push(signal.candidate);
        }
      } catch (e) {}
    }
    function sync() {
      if (destroyed || !enabled || typeof RTCPeerConnection === "undefined") return;
      const ids = participants();
      peers.forEach((_item, id) => { if (!ids.includes(id)) closePeer(id); });
      ids.forEach(id => { if (!peers.has(id)) createPeer(id, shouldInitiate(id)); });
    }
    async function rebuild() {
      peers.forEach((_item, id) => closePeer(id));
      sync();
    }
    async function toggle() {
      if (destroyed) return;
      if (typeof RTCPeerConnection === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (button) button.textContent = "浏览器不支持语音";
        return;
      }
      if (!enabled) {
        if (starting) return;
        starting = true;
        let nextStream;
        try {
          nextStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
          if (destroyed) {
            nextStream.getTracks().forEach(track => track.stop());
            return;
          }
          stream = nextStream;
          enabled = true;
          muted = false;
          stream.getAudioTracks().forEach(track => { track.enabled = true; });
          await rebuild();
          participants().forEach(id => send(id, { renegotiate: true }));
        } catch (e) {
          if (button) {
            button.textContent = e && e.name === "NotAllowedError" ? "请允许麦克风" : "语音开启失败";
            button.title = button.textContent;
            button.classList.remove("on");
            button.setAttribute("aria-pressed", "false");
          }
          return;
        } finally {
          starting = false;
        }
      } else {
        muted = !muted;
        if (stream) stream.getAudioTracks().forEach(track => { track.enabled = !muted; });
      }
      updateButton();
    }
    function destroy() {
      destroyed = true;
      enabled = false;
      muted = true;
      peers.forEach((_item, id) => closePeer(id));
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null;
      audios.forEach((_el, id) => removeAudio(id));
      if (button) button.removeEventListener("click", onButtonClick);
      if (onPageHide) w.removeEventListener("pagehide", onPageHide);
      if (button) { button.disabled = true; updateButton(); }
    }
    room.on("act", handleSignal);
    room.on("lobby", sync);
    if (button) { button.disabled = false; button.addEventListener("click", onButtonClick); }
    onPageHide = () => destroy();
    w.addEventListener("pagehide", onPageHide, { once: true });
    updateButton();
    sync();
    return { toggle, update: sync, destroy, isEnabled: () => enabled && !muted };
  }

  w.NightRoomVoice = { attach, voiceIds: () => (w.NightVoice && NightVoice.TYPES || []).map(v => v.id) };
})(window);
