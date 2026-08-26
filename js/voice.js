/* 夜牌馆 · 出牌语音：只播 Edge 神经录音，不回落系统机械朗读 */
(function (w) {
  const KEY = "nh_voice";
  const VER = "5";
  const TYPES = [
    { id: "yujie", name: "御姐", pitch: 1, rate: 1,
      preview: "我是御姐音，出牌我会报给你听" },
    { id: "loli", name: "萝莉", pitch: 1, rate: 1,
      preview: "我是萝莉音哦，出牌我会喊给你听哦" },
    { id: "dia", name: "嗲嗲", pitch: 1, rate: 1,
      preview: "人家是嗲嗲音呀，出牌会软软报给你听" },
    { id: "dahai", name: "大海", pitch: 1, rate: 1,
      preview: "嗯……叫大海。今晚把你弄到腿软，出牌我会浪给你听" },
    { id: "jieliu", name: "街溜子", pitch: 1, rate: 1,
      preview: "街溜子来了啊，报牌全他妈带脏字，接不住就滚一边去" },
    { id: "dashu", name: "大叔", pitch: 1, rate: 1,
      preview: "大叔音，出牌报给你听" },
    { id: "youth", name: "青年", pitch: 1, rate: 1,
      preview: "青年音，走起" }
  ];
  const SUIT_CN = { "♠": "黑桃", "♥": "红桃", "♣": "梅花", "♦": "方块" };
  const SUIT_KEY = { "♠": "hk", "♥": "ht", "♣": "mh", "♦": "fk" };
  const TRUMP_FILE = { "♠": "trump_hk.mp3", "♥": "trump_ht.mp3", "♣": "trump_mh.mp3", "♦": "trump_fk.mp3" };
  const JIELIU_PASS = ["pass.mp3", "pass2.mp3", "pass3.mp3", "pass4.mp3", "pass5.mp3", "pass6.mp3"];
  const JIELIU_TAUNT = ["taunt1.mp3", "taunt2.mp3", "taunt3.mp3", "taunt4.mp3", "taunt5.mp3", "taunt6.mp3", "taunt7.mp3", "taunt8.mp3"];
  let audio = null;
  let unlocked = false;
  let q = [];

  function asset(typeId, file) {
    const rel = "assets/tts/" + typeId + "/" + file;
    try { return new URL(rel, document.baseURI).href + "?v=" + VER; }
    catch (e) { return rel + "?v=" + VER; }
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    const a = new Audio(asset("youth", "preview.mp3"));
    a.volume = 0.01;
    const p = a.play();
    if (p && p.then) p.then(function () { try { a.pause(); a.currentTime = 0; } catch (e) {} }).catch(function () {});
  }
  if (w.document) {
    w.document.addEventListener("pointerdown", unlock, { capture: true });
    w.document.addEventListener("keydown", unlock, { capture: true });
  }

  function getType(id) {
    return TYPES.find(t => t.id === id) || TYPES[6];
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function cardText(c) {
    if (!c) return "";
    if (c.joker || (c.v && c.v >= 16)) return (c.jokerType === "big" || c.v === 17) ? "大王" : "小王";
    const r = c.rank || c.r;
    return (SUIT_CN[c.suit] || "") + (r || "");
  }
  function cardsText(cards) {
    return (cards || []).map(cardText).join("，");
  }
  function clipKey(c) {
    if (!c) return "";
    if (c.joker) return c.jokerType === "big" ? "dw" : "xw";
    if (c.v >= 16) return c.v === 17 ? "dw" : "xw";
    const r = c.rank || c.r;
    const s = SUIT_KEY[c.suit];
    if (!s) return "";
    return s + r;
  }
  function playUrl(url, done) {
    unlock();
    try { if (audio) { audio.pause(); audio = null; } } catch (e) {}
    const a = new Audio();
    audio = a;
    let settled = false;
    function finish(ok) {
      if (settled) return;
      settled = true;
      if (done) done(ok);
    }
    a.onended = function () { finish(true); };
    a.onerror = function () { finish(false); };
    a.src = url;
    const p = a.play();
    if (p && p.catch) {
      p.catch(function () {
        const once = function () {
          w.document.removeEventListener("pointerdown", once, true);
          a.play().then(function () {}).catch(function () { finish(false); });
        };
        w.document.addEventListener("pointerdown", once, true);
      });
    }
  }
  function speak(typeId, text, opt) {
    opt = opt || {};
    const kind = opt.kind || "say";
    const key = opt.key || "";
    let file = "";
    if (kind === "preview") file = "preview.mp3";
    else if (kind === "pass") file = typeId === "jieliu" ? pick(JIELIU_PASS) : "pass.mp3";
    else if (kind === "taunt") file = typeId === "jieliu" ? pick(JIELIU_TAUNT) : "";
    else if (kind === "trump") {
      if (key === "none" || key === "noTrump") file = "trump_none.mp3";
      else file = TRUMP_FILE[key] || "";
    }
    else if (kind === "kill" && key) file = typeId === "jieliu" ? key + "_k.mp3" : key + ".mp3";
    else if (key) file = key + ".mp3";
    if (!file) return;
    playUrl(asset(typeId, file), function (ok) {
      if (ok && typeId === "jieliu" && (kind === "play" || kind === "kill") && Math.random() < 0.28) {
        setTimeout(function () { playUrl(asset(typeId, pick(JIELIU_TAUNT)), function () {}); }, 40);
      }
    });
  }
  function speakCards(typeId, cards, killing) {
    const c = (cards && cards[0]) || null;
    const key = clipKey(c);
    const text = (killing ? "杀，" : "") + cardsText(cards);
    speak(typeId, text, { key: key, kind: killing ? "kill" : "play" });
  }
  function speakTrump(typeId, suitOrNone) {
    const key = !suitOrNone || suitOrNone === "none" || suitOrNone === "无主" ? "none" : suitOrNone;
    const text = key === "none" ? "亮无主" : ("亮 " + key + " 主");
    speak(typeId, text, { kind: "trump", key: key });
  }
  function current() {
    return localStorage.getItem(KEY) || "youth";
  }
  function setCurrent(id) {
    if (TYPES.some(t => t.id === id)) localStorage.setItem(KEY, id);
    return current();
  }
  w.NightVoice = {
    TYPES, getType, speak, speakCards, speakTrump, cardText, cardsText, clipKey,
    current, setCurrent, loadVoices: function () {}, unlock
  };
})(window);
