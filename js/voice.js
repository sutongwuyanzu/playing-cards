/* 夜牌馆 · 出牌语音（Web Speech + 系统中文音色） */
(function (w) {
  const KEY = "nh_voice";
  const TYPES = [
    { id: "yujie", name: "御姐", pitch: 0.82, rate: 0.9, prefer: ["huihui", "xiaoxiao", "xiaoyan"] },
    { id: "loli", name: "萝莉", pitch: 1.48, rate: 1.14, prefer: ["yaoyao", "xiaoyi", "huipo"] },
    { id: "dia", name: "嗲嗲", pitch: 1.62, rate: 0.92, prefer: ["yaoyao", "huihui", "xiaoyi"] },
    { id: "dahai", name: "大海", pitch: 0.38, rate: 0.58, prefer: ["huihui", "xiaoxiao", "yaoyao"],
      preview: "嗯……叫大海。今晚把你弄到腿软，出牌我会浪给你听" },
    { id: "jieliu", name: "街溜子", pitch: 0.88, rate: 1.18, prefer: ["kangkang", "yunjian", "yunxi"],
      preview: "街溜子来了，报牌全他妈脏话，接不住就滚" },
    { id: "dashu", name: "大叔", pitch: 0.62, rate: 0.84, prefer: ["kangkang", "yunxi", "yunjian"] },
    { id: "youth", name: "青年", pitch: 1.08, rate: 1.02, prefer: ["kangkang", "yunyang", "huihui"] }
  ];
  const SUIT_CN = { "♠": "黑桃", "♥": "红桃", "♣": "梅花", "♦": "方块" };
  let voices = [];
  let ready = false;

  function loadVoices() {
    if (!w.speechSynthesis) return;
    voices = speechSynthesis.getVoices() || [];
    ready = voices.length > 0;
  }
  if (w.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  function getType(id) {
    return TYPES.find(t => t.id === id) || TYPES[3];
  }
  function pickVoice(type) {
    const zh = voices.filter(v => /zh|chinese|cmn/i.test((v.lang || "") + v.name));
    const pool = zh.length ? zh : voices;
    if (!pool.length) return null;
    const t = getType(type);
    for (const key of t.prefer) {
      const hit = pool.find(v => v.name.toLowerCase().replace(/\s/g, "").includes(key));
      if (hit) return hit;
    }
    const female = pool.find(v => /female|huihui|yaoyao|zira|xiaoxiao/i.test(v.name));
    const male = pool.find(v => /male|kangkang|david/i.test(v.name));
    if (type === "dashu" || type === "youth" || type === "jieliu") return male || pool[0];
    return female || pool[0];
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function flavor(typeId, text) {
    text = String(text || "").trim();
    if (/这是|叫大海|街溜子来了|今晚把你/.test(text)) return text;
    if (typeId === "dia") {
      text = text.replace(/，/g, "嘛，");
      if (text.indexOf("杀") === 0) text = "杀掉人家啦，" + text.replace(/^杀，?/, "");
      else if (!/[呀嘛哦呢啦]$/.test(text)) text += "呀";
      return text;
    }
    if (typeId === "dahai") {
      const raw = text.replace(/^杀，?/, "");
      const kill = /^杀/.test(text);
      if (/不出/.test(text)) return pick(["今晚放过你……先含着", "不出……忍着点", "过……憋着，等我"]);
      if (kill) {
        return pick([
          "嗯啊……夹紧，杀掉，",
          "水都出来了，杀你，",
          "骚死了……慢慢杀进去，",
          "别躲，被我弄死，",
          "啊……好深，杀掉，"
        ]) + raw;
      }
      return pick(["嗯……舔一口，", "含住了……", "好烫一张，", "腿张开，接，", "轻点喘……"]) 
        + raw 
        + pick(["……再深一点", "……别停", "……嗯，好会", "……弄我"]);
    }
    if (typeId === "jieliu") {
      const raw = text.replace(/^杀，?/, "");
      if (/不出/.test(text)) return pick(["不出你妈的", "过你妈逼", "怂了滚", "不出？阳痿啊"]);
      if (/^杀/.test(text)) {
        return pick(["操，杀掉！", "你妈的杀爆！", "杀你妈的！", "毙了你个怂货，"]) + raw;
      }
      return pick(["操，", "卧槽，", "你妈的，", "我靠，", "操了，"])
        + raw
        + pick(["，接啊废物", "，整死你", "，哈，傻逼", "，来啊"]);
    }
    return text;
  }
  function cardText(c) {
    if (!c) return "";
    if (c.joker) return c.jokerType === "big" ? "大王" : "小王";
    return (SUIT_CN[c.suit] || "") + (c.rank || "");
  }
  function cardsText(cards) {
    return (cards || []).map(cardText).join("，");
  }
  function speak(typeId, text) {
    if (!text || !w.speechSynthesis) return;
    const t = getType(typeId);
    const u = new SpeechSynthesisUtterance(flavor(typeId, text));
    const v = pickVoice(typeId);
    if (v) u.voice = v;
    u.lang = (v && v.lang) || "zh-CN";
    u.pitch = t.pitch;
    u.rate = t.rate;
    u.volume = typeId === "dahai" ? 0.92 : 1;
    try { speechSynthesis.cancel(); } catch (e) {}
    speechSynthesis.speak(u);
  }
  function current() {
    return localStorage.getItem(KEY) || "youth";
  }
  function setCurrent(id) {
    if (TYPES.some(t => t.id === id)) localStorage.setItem(KEY, id);
    return current();
  }
  w.NightVoice = { TYPES, getType, speak, cardText, cardsText, current, setCurrent, loadVoices };
})(window);
