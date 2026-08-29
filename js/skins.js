/* 夜牌馆 · 牌面皮肤（底图不挡花色/牌号） */
(function (w) {
  const SUITS = ["♠", "♥", "♣", "♦"];
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const SLOTS = [];
  SUITS.forEach(s => RANKS.forEach(r => SLOTS.push(s + r)));
  SLOTS.push("JS", "JB");
  const PRESETS = {
    classic: { name: "经典", back: "assets/card-back.jpg" },
    anime: {
      name: "动漫",
      back: "assets/skins/anime/back.jpg",
      suits: { "♠": "assets/skins/anime/spade.jpg", "♥": "assets/skins/anime/heart.jpg", "♣": "assets/skins/anime/club.jpg", "♦": "assets/skins/anime/diamond.jpg" },
      pool: ["p05","p06","p07","p08"].map(n => "assets/skins/anime/"+n+".jpg")
    },
    scenic: {
      name: "风景",
      back: "assets/skins/scenic/back.jpg",
      suits: { "♠": "assets/skins/scenic/spade.jpg", "♥": "assets/skins/scenic/heart.jpg", "♣": "assets/skins/scenic/club.jpg", "♦": "assets/skins/scenic/diamond.jpg" },
      pool: ["p05","p06","p07"].map(n => "assets/skins/scenic/"+n+".jpg")
    },
    bikini: {
      name: "比基尼",
      back: "assets/skins/bikini/back.jpg",
      suits: { "♠": "assets/skins/bikini/spade.jpg", "♥": "assets/skins/bikini/heart.jpg", "♣": "assets/skins/bikini/club.jpg", "♦": "assets/skins/bikini/diamond.jpg" },
      pool: ["p01","p02","p03","p04","p05","p06","p07","p08","p09","p10","p11"].map(n => "assets/skins/bikini/"+n+".jpg")
    },
    custom: { name: "自定义", back: "assets/card-back.jpg" }
  };

  let current = localStorage.getItem("nh_skin") || "classic";
  let custom = {};
  let ready = false;

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("nh-skins", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("cards");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function loadCustom() {
    try {
      const db = await openDB();
      custom = await new Promise((resolve) => {
        const tx = db.transaction("cards", "readonly");
        const g = tx.objectStore("cards").get("pack");
        g.onsuccess = () => resolve(g.result || {});
        g.onerror = () => resolve({});
      });
      db.close();
    } catch (e) { custom = {}; }
    ready = true;
  }
  async function saveCustom() {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction("cards", "readwrite");
        tx.objectStore("cards").put(custom, "pack");
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {}
  }
  function compress(file, w, h) {
    w = w || 240; h = h || 348;
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#f4ead6";
        ctx.fillRect(0, 0, w, h);
        const sc = Math.max(w / img.width, h / img.height);
        const dw = img.width * sc, dh = img.height * sc;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  }
  function keyOf(c) {
    if (!c) return "";
    if (c.joker) return c.jokerType === "big" ? "JB" : "JS";
    if (c.v >= 16) return c.v === 17 ? "JB" : "JS";
    const r = c.rank || c.r;
    const s = c.suit;
    if (r === "小王") return "JS";
    if (r === "大王") return "JB";
    return (s || "") + (r || "");
  }
  function faceUrl(c) {
    const k = keyOf(c);
    if (current === "custom" && custom[k]) return custom[k];
    const p = PRESETS[current];
    if (!p || current === "classic") return "";
    const r = c.rank || c.r;
    const s = c.suit;
    if (current === "bikini") {
      const pre = { "♠": "S", "♥": "H", "♣": "C", "♦": "D" };
      if (k === "JS" || k === "JB") return "assets/skins/bikini/" + k + ".jpg";
      if (pre[s] && r) return "assets/skins/bikini/" + pre[s] + r + ".jpg";
    }
    const ri = Math.max(0, RANKS.indexOf(r));
    const si = Math.max(0, SUITS.indexOf(s));
    if (p.pool && p.pool.length) {
      if (k === "JB") return p.pool[p.pool.length - 1];
      if (k === "JS") return p.pool[Math.max(0, p.pool.length - 2)];
      return p.pool[(si * 3 + ri) % p.pool.length];
    }
    if (k === "JB" || k === "JS") return (p.suits && p.suits["♦"]) || p.back;
    return (p.suits && p.suits[s]) || "";
  }
  function backUrl() {
    const p = PRESETS[current] || PRESETS.classic;
    if (current === "custom" && custom.back) return custom.back;
    return p.back || "assets/card-back.jpg";
  }
  function assetUrl(path) {
    if (!path) return "";
    try { return new URL(path, document.baseURI).href; } catch (e) { return path; }
  }
  function apply(id) {
    if (!PRESETS[id]) id = "classic";
    current = id;
    localStorage.setItem("nh_skin", id);
    document.documentElement.style.setProperty("--card-back", "url(\"" + assetUrl(backUrl()) + "\")");
    document.body.setAttribute("data-skin", id);
  }
  function set(id) { apply(id); }
  function artStyle(c) {
    const u = faceUrl(c);
    if (!u) return "";
    const pos = (current === "bikini" || current === "custom") ? "center 22%" : "center 30%";
    return "background-image:url('" + u.replace(/'/g, "%27") + "');background-position:" + pos;
  }
  function faceImg(c) {
    const u = faceUrl(c);
    if (!u) return "";
    const src = u.indexOf("data:") === 0 ? u : u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=7";
    return '<img class="face-art" alt="" src="' + src.replace(/"/g, "") + '">';
  }
  function filledCount() {
    return SLOTS.filter(k => !!custom[k]).length;
  }
  async function ingest(files, slot) {
    const list = [...files].filter(f => f.type && f.type.indexOf("image/") === 0);
    if (slot && list[0]) {
      custom[slot] = await compress(list[0]);
      await saveCustom();
      return 1;
    }
    if (list.length >= 54) {
      for (let i = 0; i < 54; i++) custom[SLOTS[i]] = await compress(list[i]);
      await saveCustom();
      return 54;
    }
    return 0;
  }
  loadCustom().then(() => apply(current));
  w.NightSkin = {
    PRESETS, SLOTS, SUITS, RANKS,
    apply, set, current: () => current, faceUrl, backUrl, artStyle, faceImg, keyOf,
    ingest, filledCount, customMap: () => custom, loadCustom
  };
})(window);
