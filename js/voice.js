/* 夜牌馆 · 出牌语音：优先播放 Edge 神经音色录音，没有再回落系统朗读 */
(function (w) {
  const KEY = "nh_voice";
  const TYPES = [
    { id: "yujie", name: "御姐", pitch: 0.96, rate: 0.92, prefer: ["xiaoxiao", "xiaoxuan", "huihui"] },
    { id: "loli", name: "萝莉", pitch: 1.12, rate: 1.02, prefer: ["xiaoyi", "yaoyao"] },
    { id: "dia", name: "嗲嗲", pitch: 1.14, rate: 0.96, prefer: ["xiaobei", "xiaoxiao", "yaoyao"] },
    { id: "dahai", name: "大海", pitch: 0.88, rate: 0.76, prefer: ["xiaoxiao", "xiaohan", "huihui"],
      preview: "嗯……叫大海。今晚把你弄到腿软，出牌我会浪给你听" },
    { id: "jieliu", name: "街溜子", pitch: 0.96, rate: 0.94, prefer: ["yunjian", "yunxi", "kangkang"],
      preview: "街溜子来了啊，报牌全他妈带脏字，接不住就滚一边去" },
    { id: "dashu", name: "大叔", pitch: 0.88, rate: 0.84, prefer: ["yunyang", "yunjian", "kangkang"] },
    { id: "youth", name: "青年", pitch: 1.0, rate: 0.96, prefer: ["yunxi", "yunjian", "kangkang"] }
  ];
  const SUIT_CN = { "♠": "黑桃", "♥": "红桃", "♣": "梅花", "♦": "方块" };
  const SUIT_KEY = { "♠": "hk", "♥": "ht", "♣": "mh", "♦": "fk" };
  const TRUMP_FILE = { "♠": "trump_hk.mp3", "♥": "trump_ht.mp3", "♣": "trump_mh.mp3", "♦": "trump_fk.mp3" };
  const JIELIU_PASS = ["pass.mp3", "pass2.mp3", "pass3.mp3", "pass4.mp3", "pass5.mp3", "pass6.mp3"];
  const JIELIU_TAUNT = ["taunt1.mp3", "taunt2.mp3", "taunt3.mp3", "taunt4.mp3", "taunt5.mp3", "taunt6.mp3", "taunt7.mp3", "taunt8.mp3"];
  let voices = [];
  let audio = null;

  function loadVoices() {
    if (!w.speechSynthesis) return;
    voices = speechSynthesis.getVoices() || [];
  }
  if (w.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function getType(id) {
    return TYPES.find(t => t.id === id) || TYPES[6];
  }
  function pickVoice(type) {
    const zh = voices.filter(v => /zh|chinese|cmn|xiaoxiao|yunxi|yunjian|xiaoyi/i.test((v.lang || "") + v.name));
    const pool = zh.length ? zh : voices;
    if (!pool.length) return null;
    const t = getType(type);
    const neural = pool.filter(v => /natural|online|neural|yun|xiao|microsoft/i.test(v.name));
    const search = neural.length ? neural : pool;
    for (const key of t.prefer) {
      const hit = search.find(v => v.name.toLowerCase().replace(/\s/g, "").includes(key));
      if (hit) return hit;
    }
    const male = search.find(v => /male|yun|kangkang/i.test(v.name));
    const female = search.find(v => /female|xiao|huihui|yaoyao/i.test(v.name));
    if (type === "dashu" || type === "youth" || type === "jieliu") return male || search[0];
    return female || search[0];
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function flavor(typeId, text) {
    text = String(text || "").trim();
    if (/这是|叫大海|街溜子来了|今晚把你|御姐音|萝莉|嗲嗲|大叔音|青年音/.test(text)) return text;
    if (typeId === "dia") {
      text = text.replace(/，/g, "嘛，");
      if (text.indexOf("杀") === 0) text = "杀掉人家啦，" + text.replace(/^杀，?/, "");
      else if (!/[呀嘛哦呢啦]$/.test(text)) text += "呀";
      return text;
    }
    if (typeId === "dahai") {
      const raw = text.replace(/^杀，?/, "");
      if (/不出/.test(text)) return pick(["今晚放过你……先含着", "不出……忍着点", "过……憋着，等我"]);
      if (/^杀/.test(text)) return pick(["嗯啊……夹紧，杀掉，", "水都出来了，杀你，", "骚死了……慢慢杀进去，"]) + raw;
      if (/亮/.test(text)) return "嗯……" + text;
      return pick(["嗯……", "含住了……", "好烫一张，"]) + raw + pick(["……再深一点", "……别停", "……嗯"]);
    }
    if (typeId === "jieliu") {
      const raw = text.replace(/^杀，?/, "");
      if (/不出/.test(text)) return pick(["不出你妈的", "过你妈逼，怂了", "不出？阳痿啊", "过，下把弄死你", "过，垃圾牌懒得跟"]);
      if (/亮/.test(text)) return pick(["操，", "我靠，", "哈，"]) + text + pick(["！这门花色管你们！", "！接着啊废物！", "！谁不服谁上来！"]);
      if (/^杀/.test(text)) return pick(["杀！毙了你，", "操，杀爆，", "你妈的杀，", "砸脸上，杀，"]) + raw;
      return pick([
        "操，" + raw + "，接着！",
        "哎你丫的，" + raw + "，接啊！",
        "卧槽" + raw + "，谁接？",
        raw + "砸过去，接啊废物！",
        "来，" + raw + "，别装孙子！",
        "我靠" + raw + "，整死你！",
        "给你" + raw + "，吃不吃？",
        raw + "拍桌上了，接着啊你！"
      ]);
    }
    if (typeId === "loli" && !/哦|啦/.test(text)) return text + "哦";
    if (typeId === "yujie") return text.replace(/。/, "") + "。";
    if (typeId === "youth" && !/走起/.test(text)) return text + "，走起。";
    if (typeId === "dashu" && !/走/.test(text)) return text + "，走一趟。";
    return text;
  }
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
    try { if (audio) { audio.pause(); audio = null; } } catch (e) {}
    const a = new Audio(url);
    audio = a;
    a.onended = function () { if (done) done(true); };
    a.onerror = function () { if (done) done(false); };
    const p = a.play();
    if (p && p.catch) p.catch(function () { if (done) done(false); });
  }
  function speakSynth(typeId, text) {
    if (!w.speechSynthesis) return;
    const t = getType(typeId);
    const u = new SpeechSynthesisUtterance(flavor(typeId, text));
    const v = pickVoice(typeId);
    if (v) u.voice = v;
    u.lang = (v && v.lang) || "zh-CN";
    u.pitch = t.pitch;
    u.rate = t.rate;
    try { speechSynthesis.cancel(); } catch (e) {}
    speechSynthesis.speak(u);
  }
  function speak(typeId, text, opt) {
    opt = opt || {};
    const kind = opt.kind || "say";
    const key = opt.key || "";
    const base = "assets/tts/" + typeId + "/";
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
    if (file) {
      playUrl(base + file, function (ok) {
        if (!ok) speakSynth(typeId, text);
        else if (typeId === "jieliu" && (kind === "play" || kind === "kill") && Math.random() < 0.32) {
          setTimeout(function () {
            playUrl(base + pick(JIELIU_TAUNT), function () {});
          }, 80);
        }
      });
      return;
    }
    speakSynth(typeId, text);
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
    current, setCurrent, loadVoices
  };
})(window);
