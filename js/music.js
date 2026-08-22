/* 夜牌馆 · 国风背景乐（Web Audio 宫调式，无需外链音源） */
(function (w) {
  const KEY = "nh_bgm";
  let ctx = null, master = null, timer = null, bar = 0, on = localStorage.getItem(KEY) !== "0";
  let unlocked = false, btn = null;

  function wantOn() {
    return on;
  }
  function persist() {
    localStorage.setItem(KEY, on ? "1" : "0");
  }
  function ensure() {
    if (ctx) return ctx;
    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4200;
    master.connect(lp);
    lp.connect(ctx.destination);
    return ctx;
  }
  function env(node, t, a, d, s, r, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * s), t + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
    node.connect(g);
    g.connect(master);
    return g;
  }
  function pluck(freq, t, dur, peak) {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = "triangle";
    osc2.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 2.01, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.99, t + dur);
    env(osc, t, 0.012, 0.22, 0.18, dur, peak);
    env(osc2, t, 0.01, 0.12, 0.08, dur * 0.7, peak * 0.18);
    osc.start(t); osc.stop(t + dur + 0.05);
    osc2.start(t); osc2.stop(t + dur * 0.8);
  }
  function flute(freq, t, dur, peak) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(freq * 1.01, t + dur * 0.4);
    osc.frequency.linearRampToValueAtTime(freq, t + dur);
    env(osc, t, 0.08, 0.15, 0.55, dur, peak);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function wood(t) {
    const n = ctx.createOscillator();
    n.type = "square";
    n.frequency.setValueAtTime(180, t);
    n.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    env(n, t, 0.002, 0.04, 0.01, 0.08, 0.12);
    n.start(t); n.stop(t + 0.12);
  }
  function bell(freq, t, peak) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    env(o, t, 0.004, 0.4, 0.12, 1.4, peak);
    o.start(t); o.stop(t + 1.6);
  }

  /* 宫商角徵羽 · D 宫：D E F# A B */
  const D = 293.66, E = 329.63, Fs = 369.99, A = 440, B = 493.88;
  const D5 = 587.33, E5 = 659.25, A5 = 880, Fs5 = 739.99;
  const MELODY = [
    [D5, 1], [E5, 1], [Fs5, 2], [E5, 1], [D5, 1], [B, 2],
    [A, 2], [B, 1], [D5, 1], [E5, 2], [D5, 2],
    [Fs5, 1], [A5, 1], [Fs5, 2], [E5, 1], [D5, 1], [B, 2],
    [A, 2], [Fs, 1], [A, 1], [D5, 4]
  ];
  const BASS = [D, A / 2, D, E, Fs, A / 2, D, A / 2];

  function tick() {
    if (!ctx || !on) return;
    const bpm = 72;
    const beat = 60 / bpm;
    const t0 = ctx.currentTime + 0.06;
    const start = bar % 16;
    if (start === 0) bell(D5 * 2, t0, 0.07);
    wood(t0);
    if (start % 2 === 0) wood(t0 + beat);
    pluck(BASS[start % BASS.length], t0, beat * 1.6, 0.22);
    if (start % 4 === 2) pluck(BASS[(start + 3) % BASS.length] * 2, t0 + beat * 0.5, beat, 0.1);

    let cursor = 0;
    const loopBeats = MELODY.reduce((s, n) => s + n[1], 0);
    const offset = (start * 2) % loopBeats;
    let acc = 0;
    for (let i = 0; i < MELODY.length; i++) {
      const [f, dur] = MELODY[i];
      if (acc + dur > offset && acc < offset + 2) {
        const local = Math.max(0, acc - offset);
        flute(f, t0 + local * beat, dur * beat * 0.92, 0.11);
      }
      acc += dur;
    }
    bar++;
    timer = setTimeout(tick, beat * 2 * 1000);
  }
  async function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === "suspended") {
      try { await c.resume(); } catch (e) {}
    }
    unlocked = true;
    if (on && !timer) tick();
  }
  function setOn(v) {
    on = !!v;
    persist();
    paint();
    if (on) unlock();
    else {
      if (timer) { clearTimeout(timer); timer = null; }
      if (master && ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
        setTimeout(() => { if (master && on === false) master.gain.value = 0.18; }, 400);
      }
    }
    if (on && master && ctx) master.gain.value = 0.18;
  }
  function paint() {
    if (!btn) return;
    btn.classList.toggle("off", !on);
    btn.title = on ? "关闭国风乐" : "打开国风乐";
    btn.textContent = on ? "乐" : "静";
  }
  function inject() {
    if (btn) return;
    btn = document.createElement("button");
    btn.className = "music-fab";
    btn.type = "button";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setOn(!on);
    });
    document.body.appendChild(btn);
    paint();
    const arm = () => { unlock(); };
    document.addEventListener("pointerdown", arm, { once: true });
    document.addEventListener("keydown", arm, { once: true });
    if (on) setTimeout(unlock, 400);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
  w.NightBGM = { setOn, wantOn, unlock };
})(window);
