/* 夜牌馆 · 出牌语音：牌面报牌保留短音频，角色台词使用 Qwen3-TTS 合成音频 */
(function (w) {
  const KEY = "nh_voice";
  const VER = "6";
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
  const PERSONAS = {
    dashu: {
      role: "沉稳牌桌老手",
      timbre: "温厚偏低的男声，近讲感强，语气松弛",
      direction: "语速偏慢，句尾收住，像熟悉牌局的邻桌大哥",
      lines: {
        bid: ["我先看看牌。", "这把稳一点。", "三分，接住。"],
        play: ["轮到我了。", "这张先走。", "慢慢来。"],
        pass: ["这轮不跟。", "先让一手。"],
        win: ["牌路清楚，赢得自然。", "这局收下了。"],
        lose: ["好牌，下一局再来。", "输得明白。"]
      }
    },
    yujie: {
      role: "冷静的牌桌主理人",
      timbre: "清晰柔和的女声，中高音区，带一点气声",
      direction: "吐字利落，节奏从容，胜负时保持克制的笑意",
      lines: {
        bid: ["我看到了。", "这一手不错。", "三分，请。"],
        play: ["该我出牌了。", "别急，慢慢看。", "这一张。"],
        pass: ["这一轮先过。", "我再看看。"],
        win: ["谢谢，让我赢得漂亮。", "这局我收下了。"],
        lose: ["恭喜，打得很好。", "下一局见。"]
      }
    },
    youth: {
      role: "热心的新手牌友",
      timbre: "自然明亮的青年男声，带轻微笑意",
      direction: "语速中等，重音清楚，偶尔有兴奋的上扬",
      lines: {
        bid: ["我来试试。", "这牌能打。", "跟一分。"],
        play: ["看我的。", "先出这张。", "到我啦。"],
        pass: ["这轮先不出。", "留点后手。"],
        win: ["漂亮！这把赢了。", "手感来了。"],
        lose: ["差一点，再来。", "这局学到了。"]
      }
    }
    ,
    loli: { role: "轻快的俏皮牌友", timbre: "明亮轻盈的少女声，清晰不尖", direction: "短句、轻快、带一点撒娇", lines: { bid:["我来啦。"], play:["轮到我咯。"], pass:["这次先不要。"], win:["赢啦。"], lose:["下次一定。"] } },
    dia: { role: "温柔的气氛玩家", timbre: "柔软甜润的女声，近距离说话感", direction: "语气柔和，尾音略带笑意", lines: { bid:["我看一下哦。"], play:["这一张，好吗？"], pass:["先不跟啦。"], win:["运气真好。"], lose:["没关系，再来。"] } },
    dahai: { role: "低沉的海派玩家", timbre: "宽厚低沉的男声，气息自然", direction: "慢速、开阔、像在牌桌边聊天", lines: { bid:["稳住。"], play:["海里走一张。"], pass:["这轮放过。"], win:["漂亮收官。"], lose:["输赢正常。"] } },
    jieliu: { role: "嘴硬的街头牌友", timbre: "干脆有颗粒感的男声，略带沙哑", direction: "节奏明快，带轻微调侃但不过度冒犯", lines: { bid:["来，接着。"], play:["看好了。"], pass:["先让你。"], win:["就这水平？"], lose:["算你走运。"] } }
  };
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
  function persona(typeId) { return PERSONAS[typeId] || PERSONAS.youth; }
  function line(typeId, kind) {
    const list = persona(typeId).lines[kind] || [];
    return list.length ? pick(list) : "";
  }
  function speakLine(typeId, kind, text) {
    const list = persona(typeId).lines[kind] || [];
    const index = list.indexOf(text);
    if (index < 0) return false;
    playUrl(asset(typeId, "line_" + kind + "_" + (index + 1) + ".wav"), function () {});
    return true;
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
    TYPES, PERSONAS, getType, persona, line, speakLine, speak, speakCards, speakTrump, cardText, cardsText, clipKey,
    current, setCurrent, loadVoices: function () {}, unlock
  };
})(window);
