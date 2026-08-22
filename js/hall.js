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
  w.NightHall = { nick, setNick, hallUrl, pageUrl, invite, inviteRoom, shareText, toast };
})(window);
