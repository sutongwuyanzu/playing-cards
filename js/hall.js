/* 夜牌馆 · nickname + invite */
(function (w) {
  const KEY = "nh_nick";
  function nick() {
    return (localStorage.getItem(KEY) || "").trim() || "过客";
  }
  function setNick(n) {
    n = (n || "").trim().slice(0, 8);
    if (n) localStorage.setItem(KEY, n);
    return nick();
  }
  function hallUrl() {
    const u = new URL(location.href);
    u.hash = "";
    u.search = "";
    u.pathname = u.pathname.replace(/[^/]*$/, "");
    if (!u.pathname.endsWith("/")) u.pathname += "/";
    return u.toString();
  }
  function pageUrl(page, room) {
    const u = new URL(page, hallUrl());
    if (room) u.searchParams.set("room", room);
    return u.toString();
  }
  async function shareText(text, url) {
    if (navigator.share) {
      try {
        await navigator.share({ title: "夜牌馆", text, url: url || undefined });
        return "shared";
      } catch (e) {
        if (e && e.name === "AbortError") return "abort";
      }
    }
    try {
      await navigator.clipboard.writeText(url ? text + "\n" + url : text);
      toast("邀请已复制，发给朋友即可");
      return "copied";
    } catch (e) {
      toast(url || text);
      return "shown";
    }
  }
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("show"), 1800);
  }
  async function invite() {
    const url = hallUrl();
    return shareText("来夜牌馆玩两把。点开就能坐。", url);
  }
  async function inviteRoom(gameName, code, page) {
    const url = pageUrl(page || "index.html", code);
    return shareText("来夜牌馆" + gameName + "，房间码 " + code, url);
  }
  function roomProfile(code) {
    const key = "nh_room_profile_" + String(code || "").toUpperCase();
    try {
      const cached = JSON.parse(sessionStorage.getItem(key) || "null");
      if (cached && cached.nick && cached.voice) {
        setNick(cached.nick);
        if (w.NightVoice && w.NightVoice.setCurrent) w.NightVoice.setCurrent(cached.voice);
        return Promise.resolve(cached);
      }
    } catch (e) {}
    return new Promise(resolve => {
      const overlay = document.createElement("div");
      overlay.className = "overlay show";
      overlay.id = "roomProfilePrompt";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = '<div class="modal room-modal profile-modal" tabindex="-1" aria-labelledby="profileTitle" aria-describedby="profileHint"><h2 id="profileTitle">进入牌局</h2><p class="profile-hint" id="profileHint">先留下雅号和牌桌音色，房间里的朋友都能看到。</p><label for="profileNick">雅号<input class="room-input" id="profileNick" maxlength="8" autocomplete="nickname" placeholder="请输入昵称"></label><label for="profileVoice">牌桌音色<select class="room-input" id="profileVoice"></select></label><div class="profile-error" id="profileError" aria-live="polite"></div><div class="gate-actions"><button class="btn btn-gold" id="profileConfirm">进入房间</button><button class="btn btn-ghost" id="profileCancel">取消</button></div></div>';
      document.body.appendChild(overlay);
      const nickEl = overlay.querySelector("#profileNick");
      const voiceEl = overlay.querySelector("#profileVoice");
      const errorEl = overlay.querySelector("#profileError");
      nickEl.value = nick() === "过客" ? "" : nick();
      const voices = w.NightVoice && w.NightVoice.TYPES || [{ id: "youth", name: "青年" }];
      voices.forEach(v => {
        const option = document.createElement("option");
        option.value = v.id;
        option.textContent = v.name;
        voiceEl.appendChild(option);
      });
      voiceEl.value = w.NightVoice && w.NightVoice.current ? w.NightVoice.current() : "youth";
      const close = value => { overlay.remove(); resolve(value); };
      const modal = overlay.querySelector(".profile-modal");
      overlay.querySelector("#profileConfirm").onclick = () => {
        const value = (nickEl.value || "").trim().slice(0, 8);
        if (!value) { errorEl.textContent = "请输入雅号后再进入"; nickEl.focus(); return; }
        const selectedVoice = voiceEl.value || "youth";
        setNick(value);
        if (w.NightVoice && w.NightVoice.setCurrent) w.NightVoice.setCurrent(selectedVoice);
        const profile = { nick: value, voice: selectedVoice };
        try { sessionStorage.setItem(key, JSON.stringify(profile)); } catch (e) {}
        close(profile);
      };
      overlay.querySelector("#profileCancel").onclick = () => close(null);
      nickEl.addEventListener("keydown", e => { if (e.key === "Enter") overlay.querySelector("#profileConfirm").click(); });
      overlay.addEventListener("keydown", e => {
        if (e.key === "Escape") { e.preventDefault(); close(null); return; }
        if (e.key !== "Tab") return;
        const focusable = [...overlay.querySelectorAll("button, input, select")].filter(el => !el.disabled);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      modal.focus();
      nickEl.focus();
    });
  }
  w.NightHall = { nick, setNick, hallUrl, pageUrl, invite, inviteRoom, roomProfile, shareText, toast };
})(window);
