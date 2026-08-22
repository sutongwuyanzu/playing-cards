/* 夜牌馆 · 出牌语音（Web Speech + 系统中文音色） */
(function (w) {
  const KEY = "nh_voice";
  const TYPES = [
    { id: "yujie", name: "御姐", pitch: 0.82, rate: 0.9, prefer: ["huihui", "xiaoxiao", "xiaoyan"] },
    { id: "loli", name: "萝莉", pitch: 1.48, rate: 1.14, prefer: ["yaoyao", "xiaoyi", "huipo"] },
    { id: "dia", name: "嗲嗲", pitch: 1.62, rate: 0.92, prefer: ["yaoyao", "huihui", "xiaoyi"] },
    { id: "dahai", name: "大海", pitch: 0.48, rate: 0.68, prefer: ["huihui", "xiaoxiao", "yaoyao"] },
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
    if (type === "dashu" || type === "youth") return male || pool[0];
    return female || pool[0];
  }
  function flavor(typeId, text) {
    text = String(text || "");
    if (typeId === "dia") {
      text = text.replace(/，/g, "嘛，");
      if (text.indexOf("杀") === 0) text = "杀掉人家啦，" + text.replace(/^杀，?/, "");
      else if (!/[呀嘛哦呢啦]$/.test(text)) text += "呀";
      return text;
    }
    if (typeId === "dahai") {
      text = text.replace(/，/g, "……");
      if (text.indexOf("杀") === 0) text = "慢慢杀掉……" + text.replace(/^杀，?/, "");
      return text;
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
    u.volume = typeId === "dahai" ? 0.88 : 1;
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
