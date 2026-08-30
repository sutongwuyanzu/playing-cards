/* 夜牌馆 · 房间码联机
   MQTT 公网（跨设备）+ BroadcastChannel（同浏览器标签）
   房主权威：lobby / state 仅房主发布
*/
(function (w) {
  const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const PREFIX = "yephaiguan/v1/";
  const BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.emqx.io:8083/mqtt",
    "wss://broker.hivemq.com:8884/mqtt"
  ];
  const KEY_PID = "nh_pid";

  function pid() {
    let id = localStorage.getItem(KEY_PID);
    if (!id) {
      id = "p" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      localStorage.setItem(KEY_PID, id);
    }
    return id;
  }
  function nick() {
    return (w.NightHall && NightHall.nick()) || "过客";
  }
  function voice() {
    return (w.NightVoice && NightVoice.current && NightVoice.current()) || "youth";
  }
  function validVoice(value) {
    const ids = w.NightVoice && NightVoice.TYPES ? NightVoice.TYPES.map(v => v.id) : ["yujie", "loli", "dia", "dahai", "jieliu", "dashu", "youth"];
    return ids.includes(value) ? value : voice();
  }
  function makeCode() {
    let s = "";
    for (let i = 0; i < 6; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
    return s;
  }
  function mid() {
    return pid() + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }
  function safeClone(value, depth, key) {
    depth = depth || 0;
    if (depth > 8) return null;
    if (value == null || typeof value === "number" || typeof value === "boolean") {
      return typeof value === "number" && !Number.isFinite(value) ? null : value;
    }
    if (typeof value === "string") {
      const relaxed = key === "nick" || key === "text" || key === "sdp" || key === "candidate";
      const pattern = relaxed ? /[<>]/ : /[<>"'`]/;
      const max = key === "sdp" ? 16000 : key === "candidate" ? 2048 : 256;
      return value.length <= max && !pattern.test(value) ? value : null;
    }
    if (Array.isArray(value)) {
      if (value.length > 256) return null;
      const out = [];
      for (const item of value) {
        const clean = safeClone(item, depth + 1, null);
        if (clean === null && item !== null) return null;
        out.push(clean);
      }
      return out;
    }
    if (typeof value === "object") {
      const keys = Object.keys(value);
      if (keys.length > 128) return null;
      const out = Object.create(null);
      for (const key of keys) {
        if (!/^[A-Za-z0-9_$-]{1,64}$/.test(key)) return null;
        if (key === "__proto__" || key === "prototype" || key === "constructor") return null;
        const clean = safeClone(value[key], depth + 1, key);
        if (clean === null && value[key] !== null) return null;
        out[key] = clean;
      }
      return out;
    }
    return null;
  }

  function Emitter() {
    this._h = {};
  }
  Emitter.prototype.on = function (ev, fn) {
    (this._h[ev] = this._h[ev] || []).push(fn);
    return () => { this._h[ev] = (this._h[ev] || []).filter(x => x !== fn); };
  };
  Emitter.prototype.emit = function (ev, data) {
    (this._h[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.warn(e); } });
  };

  function Room(code, game, asHost) {
    Emitter.call(this);
    this.code = (code || "").toUpperCase();
    this.game = game;
    this.pid = pid();
    this.hostId = asHost ? this.pid : null;
    this.online = false;
    this.mqtt = null;
    this.bc = null;
    this.seen = [];
    this.lobby = null;
    this.state = null;
    this._hb = null;
    this._watch = null;
    this._alive = {};
    this._closed = false;
    this._brokerI = 0;
  }
  Room.prototype = Object.create(Emitter.prototype);

  Room.prototype.isHost = function () {
    return this.hostId === this.pid;
  };
  Room.prototype.topics = function () {
    const p = PREFIX + this.code;
    return { lobby: p + "/lobby", state: p + "/state", bus: p + "/bus" };
  };

  Room.prototype.open = function () {
    const chName = "nh-" + this.code;
    try {
      this.bc = new BroadcastChannel(chName);
      this.bc.onmessage = (ev) => this._onMsg(ev.data, "bc");
    } catch (e) { this.bc = null; }
    this._connectMqtt();
    this._hb = setInterval(() => this._heartbeat(), 3000);
    this._watch = setInterval(() => this._gc(), 2000);
    this._heartbeat();
    this.emit("status", { online: this.online, code: this.code });
  };

  Room.prototype._connectMqtt = function () {
    if (this._closed || typeof mqtt === "undefined") {
      this.emit("status", { online: false, reason: "no-mqtt" });
      return;
    }
    const url = BROKERS[this._brokerI % BROKERS.length];
    try {
      if (this.mqtt) {
        try { this.mqtt.end(true); } catch (e) {}
      }
      const c = mqtt.connect(url, {
        clientId: "nh" + this.pid.slice(-12),
        clean: true,
        reconnectPeriod: 2500,
        connectTimeout: 8000,
        keepalive: 30
      });
      this.mqtt = c;
      c.on("connect", () => {
        this.online = true;
        const t = this.topics();
        c.subscribe([t.lobby, t.state, t.bus], { qos: 0 });
        this.emit("status", { online: true, broker: url, code: this.code });
        this._heartbeat();
        this.hello();
        if (this.isHost() && this.lobby) this.publishLobby(this.lobby);
        if (this.isHost() && this.state) this.publishState(this.state);
      });
      c.on("message", (_topic, buf) => {
        try { this._onMsg(JSON.parse(buf.toString()), "mqtt"); } catch (e) {}
      });
      c.on("close", () => {
        this.online = false;
        this.emit("status", { online: false, code: this.code });
      });
      c.on("error", () => {});
      c.on("offline", () => {
        this.online = false;
        this.emit("status", { online: false, code: this.code });
      });
    } catch (e) {
      this._brokerI++;
      setTimeout(() => this._connectMqtt(), 1500);
    }
  };

  Room.prototype._onMsg = function (msg, via) {
    if (via !== "local") {
      msg = safeClone(msg);
      if (!msg) return;
    }
    if (!msg || !msg.mid) return;
    if (this.seen.includes(msg.mid)) return;
    this.seen.push(msg.mid);
    if (this.seen.length > 400) this.seen.splice(0, 200);
    if (msg.t === "lobby" && msg.lobby && msg.from === msg.lobby.hostId && (!this.hostId || this.hostId === msg.from)) {
      this.lobby = msg.lobby;
      if (msg.lobby.hostId) this.hostId = msg.lobby.hostId;
      this.emit("lobby", this.lobby);
      return;
    }
    if (msg.t === "state" && msg.state && this.hostId && msg.from === this.hostId) {
      this.state = msg.state;
      this.emit("state", this.state);
      return;
    }
    if (msg.t === "hb") {
      const first = !this._alive[msg.id];
      this._alive[msg.id] = { nick: msg.nick, ts: Date.now() };
      this.emit("presence", this._alive);
      if (first && msg.id !== this.pid) this.emit("hello", msg);
      return;
    }
    if (msg.t === "hello") {
      this._alive[msg.id] = { nick: msg.nick, ts: Date.now() };
      if (this.isHost() && this.lobby) this.publishLobby(this.lobby);
      this.emit("hello", msg);
      return;
    }
    if (msg.from === this.pid && via) return;
    if (msg.t === "act" && msg.id && msg.from === msg.id) this.emit("act", msg);
  };

  Room.prototype._send = function (topicKey, obj, retain) {
    obj.mid = obj.mid || mid();
    obj.ts = Date.now();
    obj.from = this.pid;
    if (this.bc) {
      try { this.bc.postMessage(obj); } catch (e) {}
    }
    if (this.mqtt && this.mqtt.connected) {
      const t = this.topics()[topicKey];
      try {
        this.mqtt.publish(t, JSON.stringify(obj), { qos: 0, retain: !!retain });
      } catch (e) {}
    }
    this._onMsg(obj, "local");
  };

  Room.prototype._heartbeat = function () {
    this._send("bus", { t: "hb", id: this.pid, nick: nick(), voice: voice() });
  };
  Room.prototype._gc = function () {
    const now = Date.now();
    let changed = false;
    Object.keys(this._alive).forEach(id => {
      if (now - this._alive[id].ts > 14000) { delete this._alive[id]; changed = true; }
    });
    if (changed) this.emit("presence", this._alive);
    if (this.lobby && this.hostId && !this._alive[this.hostId] && this.lobby.stage === "wait") {
      const ids = Object.keys(this._alive).sort();
      if (ids[0] === this.pid) {
        this.hostId = this.pid;
        const L = Object.assign({}, this.lobby, { hostId: this.pid });
        this.publishLobby(L);
      }
    }
  };

  Room.prototype.hello = function () {
    this._send("bus", { t: "hello", id: this.pid, nick: nick(), voice: voice(), game: this.game });
  };
  Room.prototype.send = function (act) {
    const msg = Object.assign({ t: "act" }, act, { id: this.pid, nick: nick(), voice: voice() });
    this._send("bus", msg, false);
  };
  Room.prototype.publishLobby = function (lobby) {
    this.lobby = lobby;
    this.hostId = lobby.hostId || this.hostId;
    this._send("lobby", { t: "lobby", lobby: lobby }, true);
  };
  Room.prototype.publishState = function (state) {
    this.state = state;
    this._send("state", { t: "state", state: state }, true);
  };
  Room.prototype.close = function () {
    this._closed = true;
    clearInterval(this._hb);
    clearInterval(this._watch);
    try { if (this.bc) this.bc.close(); } catch (e) {}
    try { if (this.mqtt) this.mqtt.end(true); } catch (e) {}
  };

  function emptySeats(n) {
    const a = [];
    for (let i = 0; i < n; i++) a.push({ kind: "empty" });
    return a;
  }
  const AI_POOL = [
    { name: "东哥", avatar: "assets/avatars/dongge.jpg", voice: "dashu", role: "沉稳牌桌老手" },
    { name: "阿兰", avatar: "assets/avatars/alan.jpg", voice: "yujie", role: "冷静的牌桌主理人" },
    { name: "老周", avatar: "assets/avatars/laozhou.jpg", voice: "youth", role: "热心的新手牌友" }
  ];
  function fillAI(seats) {
    let k = 0;
    return seats.map(s => {
      if (s.kind !== "empty") return s;
      const ai = AI_POOL[k % AI_POOL.length];
      k++;
      return { kind: "ai", name: ai.name, avatar: ai.avatar, voice: ai.voice, role: ai.role };
    });
  }
  function takeSeat(seats, human, prefer) {
    const copy = seats.map(s => Object.assign({}, s));
    const mine = copy.findIndex(s => s.kind === "human" && s.id === human.id);
    if (mine >= 0 && (prefer == null || prefer < 0)) {
      copy[mine].nick = human.nick;
      if (human.voice) copy[mine].voice = validVoice(human.voice);
      return copy;
    }
    let idx = prefer;
    if (idx == null || idx < 0) {
      idx = copy.findIndex(s => s.kind === "empty");
      if (idx < 0) idx = copy.findIndex(s => s.kind === "ai");
    }
    if (idx < 0) return copy;
    if (copy[idx].kind === "human" && copy[idx].id !== human.id) {
      if (mine >= 0) {
        const tmp = copy[idx];
        copy[idx] = copy[mine];
        copy[mine] = tmp;
        copy[idx].nick = human.nick;
        return copy;
      }
      return copy;
    }
    if (mine >= 0 && mine !== idx) copy[mine] = { kind: "empty" };
    copy[idx] = { kind: "human", id: human.id, nick: human.nick, voice: validVoice(human.voice) };
    return copy;
  }
  function swapSeats(seats, a, b) {
    if (a === b || a < 0 || b < 0 || a >= seats.length || b >= seats.length) return seats;
    const copy = seats.map(s => Object.assign({}, s));
    const tmp = copy[a];
    copy[a] = copy[b];
    copy[b] = tmp;
    return copy;
  }
  function setAiCount(seats, n) {
    const out = seats.map(s => s.kind === "human" ? Object.assign({}, s) : { kind: "empty" });
    let need = Math.max(0, n | 0);
    let k = 0;
    for (let i = 0; i < out.length && need > 0; i++) {
      if (out[i].kind === "empty") {
        const ai = AI_POOL[k % AI_POOL.length];
        k++;
        out[i] = { kind: "ai", name: ai.name, avatar: ai.avatar, voice: ai.voice, role: ai.role };
        need--;
      }
    }
    return out;
  }

  w.NightNet = {
    pid: pid(),
    makeCode,
    emptySeats,
    fillAI,
    takeSeat,
    swapSeats,
    setAiCount,
    AI_POOL,
    create(game, nSeats, cfg) {
      const code = makeCode();
      const room = new Room(code, game, true);
      const seats = emptySeats(nSeats);
      seats[0] = { kind: "human", id: pid(), nick: nick(), voice: voice() };
      const filled = (cfg && cfg.fillAI !== false) ? fillAI(seats) : seats;
      room.lobby = {
        v: 1,
        game,
        hostId: pid(),
        cfg: Object.assign({ decks: 2, region: "通用", randomSeats: false, fillAI: true }, cfg || {}),
        seats: filled,
        stage: "wait"
      };
      room.open();
      room.publishLobby(room.lobby);
      room.hello();
      return room;
    },
    join(game, code) {
      const room = new Room(code, game, false);
      room.open();
      room.hello();
      return room;
    },
    soloLobby(game, nSeats, cfg) {
      const seats = emptySeats(nSeats);
      seats[0] = { kind: "human", id: pid(), nick: nick(), voice: voice() };
      return {
        v: 1,
        game,
        hostId: pid(),
        cfg: Object.assign({ decks: 2, region: "通用", randomSeats: false, fillAI: true }, cfg || {}),
        seats: fillAI(seats),
        stage: "play",
        solo: true
      };
    }
  };
})(window);
