import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const base = process.env.BASE_URL || 'http://127.0.0.1:8765';
const executablePath = process.env.CHROME_PATH || undefined;
const browser = await chromium.launch({ headless: true, executablePath });

async function open(path, viewport = { width: 390, height: 844 }) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${base}/${path}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, `${path} should load`);
  return { page, errors };
}

try {
  for (const path of ['index.html', 'doudizhu.html', 'shengji.html']) {
    const { page, errors } = await open(path);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path} overflows horizontally`);
    assert.deepEqual(errors, [], `${path} has uncaught errors`);
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(async () => {
      const response = await fetch('assets/tts/dashu/line_bid_1.wav');
      return {
        status: response.status,
        hasLinePlayer: typeof NightVoice.speakLine === 'function',
        policy: NightVoice.VOICE_POLICY
      };
    });
    assert.equal(result.status, 200, 'Qwen3-TTS 台词音频应可访问');
    assert.equal(result.hasLinePlayer, true, '语音模块应暴露台词播放器');
    assert.deepEqual(result.policy, { maxQueue: 3, maxClipMs: 5000 }, '语音应使用不打断队列策略');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(async () => {
      const OriginalAudio = window.Audio;
      let attempts = 0;
      window.Audio = class {
        play() {
          attempts++;
          return attempts === 1 ? Promise.reject(new DOMException('blocked', 'NotAllowedError')) : Promise.resolve();
        }
        pause() {}
      };
      NightVoice.VOICE_POLICY.maxClipMs = 20;
      NightVoice.speak('youth', '', { kind: 'preview' });
      await new Promise(resolve => setTimeout(resolve, 50));
      const beforeGesture = attempts;
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 10));
      const afterGesture = attempts;
      window.Audio = OriginalAudio;
      return { beforeGesture, afterGesture };
    });
    assert.deepEqual(result, { beforeGesture: 1, afterGesture: 2 }, '自动播放被拒后应等待手势重试，不应被超时计时清掉');
    await page.close();
  }

  for (const path of ['doudizhu.html', 'shengji.html']) {
    const { page } = await open(path, { width: 844, height: 390 });
    const layout = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      appHeight: document.querySelector('.app').getBoundingClientRect().height,
      viewportHeight: innerHeight,
      handBottom: document.querySelector('.hand,.handbar')?.getBoundingClientRect().bottom || 0
    }));
    assert.equal(layout.documentWidth <= layout.viewportWidth, true, `${path} 横屏不应横向溢出`);
    assert.equal(layout.appHeight <= layout.viewportHeight + 1, true, `${path} 横屏牌桌应限制在可视高度`);
    assert.equal(layout.handBottom > 0 && layout.handBottom <= layout.viewportHeight + 1, true, `${path} 横屏手牌应留在视口内`);
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(async () => {
      sessionStorage.removeItem('nh_room_profile_SMOKEPROFILE');
      const pending = NightHall.roomProfile('SMOKEPROFILE');
      document.querySelector('#profileNick').value = '测试友';
      document.querySelector('#profileConfirm').click();
      return { profile: await pending, hasRtc: typeof NightRoomVoice.attach === 'function' };
    });
    assert.deepEqual(result.profile.nick, '测试友', '入房前应确认昵称');
    assert.equal(typeof result.profile.voice, 'string', '入房前应选择音色');
    assert.equal(result.hasRtc, true, '房间页面应加载实时语音模块');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(async () => {
      const sent = [];
      class SessionDescription {
        constructor(type, sdp) { this.type = type; this.sdp = sdp; }
      }
      class FakePeerConnection {
        constructor() { this.signalingState = 'stable'; this.connectionState = 'new'; }
        addTrack() {}
        createOffer() { return Promise.resolve(new SessionDescription('offer', 'v=0')); }
        setLocalDescription(description) { this.localDescription = new SessionDescription(description.type, description.sdp); return Promise.resolve(); }
        close() { this.connectionState = 'closed'; }
      }
      window.RTCPeerConnection = FakePeerConnection;
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async () => ({ getTracks: () => [{ stop() {} }], getAudioTracks: () => [{ enabled: false }] })
      });
      const room = {
        pid: NightNet.pid,
        lobby: { seats: [{ kind: 'human', id: 'remote' }] },
        on() {},
        send(message) { sent.push(message); }
      };
      const voice = NightRoomVoice.attach(room);
      await voice.toggle();
      await new Promise(resolve => setTimeout(resolve, 30));
      const offer = sent.find(message => message.signal && message.signal.description);
      const cloneable = offer ? structuredClone(offer) : null;
      const result = {
        hasOffer: !!offer,
        plainDescription: !!offer && Object.getPrototypeOf(offer.signal.description) === Object.prototype,
        cloneable: !!cloneable
      };
      voice.destroy();
      return result;
    });
    assert.deepEqual(result, { hasOffer: true, plainDescription: true, cloneable: true }, 'WebRTC 描述必须规范化成可跨 BroadcastChannel 结构化克隆的普通对象');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(() => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay show';
      overlay.innerHTML = '<div class="modal profile-modal" role="dialog"><div class="say show">快点吧</div></div>';
      document.body.appendChild(overlay);
      const bubble = overlay.querySelector('.say').getBoundingClientRect();
      return { role: overlay.querySelector('[role="dialog"]').getAttribute('role'), width: bubble.width, height: bubble.height };
    });
    assert.equal(result.role, 'dialog', '入房弹窗应声明对话框语义');
    assert.equal(result.width > result.height, true, '语音气泡应优先横向展示');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(() => ({
      anime: NightSkin.PRESETS.anime.pool,
      scenic: NightSkin.PRESETS.scenic.pool
    }));
    assert.equal(new Set(result.anime).size, result.anime.length, '动漫皮肤牌面池不应重复');
    assert.equal(new Set(result.scenic).size, result.scenic.length, '风景皮肤牌面池不应重复');
    assert.equal(result.anime.every(path => !/p0[1-4]\.jpg$/.test(path)), true, '动漫皮肤不应复用花色示例图');
    assert.equal(result.scenic.every(path => !/p0[1-4]\.jpg$/.test(path)), true, '风景皮肤不应复用花色示例图');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(async () => {
      NightSkin.set('bikini');
      const cards = NightSkin.SLOTS.map(key => key === 'JS' || key === 'JB'
        ? { joker: true, jokerType: key === 'JB' ? 'big' : 'small' }
        : { suit: key[0], r: key.slice(1) });
      const urls = cards.map(card => NightSkin.faceUrl(card));
      const sources = cards.map(card => NightSkin.faceImg(card).match(/src="([^"]+)/)?.[1] || '');
      const responses = await Promise.all(sources.map(src => fetch(src)));
      return {
        count: urls.length,
        unique: new Set(urls).size,
        versioned: sources.every(src => src.endsWith('?v=8')),
        loaded: responses.every(response => response.ok && response.headers.get('content-type')?.includes('image/jpeg'))
      };
    });
    assert.deepEqual(result, { count: 54, unique: 54, versioned: true, loaded: true }, '比基尼 54 张牌面应各有可加载的独立底图');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html', { width: 1440, height: 900 });
    const result = await page.evaluate(() => {
      const hand = [
        { id: 'S3', v: 3, r: '3', suit: '♠' },
        { id: 'H7', v: 7, r: '7', suit: '♥' },
        { id: 'C7', v: 7, r: '7', suit: '♣' }
      ];
      const combo = aiFollow(hand, { type: 'single', rank: 2, len: 1, cards: [{ id: 'D2', v: 2 }] });
      return { hasCards: !!combo?.cards?.length, type: combo?.type };
    });
    assert.equal(result.hasCards, true, '斗地主 AI must return a combo with cards');
    assert.equal(result.type, 'single', '斗地主 AI single follow should stay single');
    await page.close();
  }

  {
    const { page } = await open('shengji.html');
    const result = await page.evaluate(() => {
      const trump = { trumpSuit: '♠', level: '2', noTrump: false };
      const lead = [{ id: 'l1', suit: '♥', rank: '7' }, { id: 'l2', suit: '♥', rank: '8' }];
      const hand = [{ id: 'h1', suit: '♥', rank: 'A' }, { id: 'h2', suit: '♣', rank: '3' }, { id: 'h3', suit: '♦', rank: '4' }];
      const selected = [hand[0], hand[1]];
      return { options: getValidPlays(hand, lead, trump, false).options.length, legal: isLegalPlay(hand, selected, lead, trump, false) };
    });
    assert.equal(result.options > 0, true, '升级部分跟门应有合法选项');
    assert.equal(result.legal, true, '升级部分跟门组合应通过校验');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(() => {
      G = {
        hands: [[], [], []], landlord: 0, landlordBid: 1, turn: 0, phase: 'play',
        bids: [1, 0, 0], highestBid: 1, bidTurn: 0, lastPlay: null,
        lastPlayer: -1, passes: 0, bombCount: 0, finished: false,
        selected: new Set(), hints: [], hintIdx: 0
      };
      const invalidLeadPass = applyPass(0);
      G.lastPlay = { type: 'single', rank: 9, len: 1, cards: [{ id: 'H9', v: 9 }] };
      G.lastPlayer = 2;
      const wrongSeatPass = applyPass(1);
      const validPass = applyPass(0);
      const passCount = G.passes;
      G.turn = 1;
      const nextValidPass = applyPass(1);
      const reset = G.lastPlay === null && G.turn === 2 && G.passes === 0;
      G.finished = true;
      const finishedPass = applyPass(2);
      return { invalidLeadPass, wrongSeatPass, validPass, passCount, nextValidPass, reset, finishedPass };
    });
    assert.deepEqual(result, {
      invalidLeadPass: false, wrongSeatPass: false, validPass: true,
      passCount: 1, nextValidPass: true, reset: true, finishedPass: false
    }, '斗地主不应接受领出回合、错位或已结束状态下的不出动作');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(() => {
      const map = NightSkin.customMap();
      map['♥A'] = 'data:image/jpeg;base64,AA==';
      NightSkin.set('custom');
      return NightSkin.faceImg({ suit: '♥', r: 'A', v: 14 }).match(/src="([^"]+)/)?.[1] || '';
    });
    assert.equal(result, 'data:image/jpeg;base64,AA==', '自定义 Data URL 不应追加缓存查询参数');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(async () => {
      window.mqtt = undefined;
      window.__smokeRoom = NightNet.join('doudizhu', 'SMOKE1');
      let accepted = false;
      window.__smokeRoom.on('lobby', () => { accepted = true; });
      const bc = new BroadcastChannel('nh-SMOKE1');
      bc.postMessage({ mid: 'smoke-evil', from: 'attacker', t: 'lobby', lobby: { hostId: 'attacker', game: 'doudizhu', seats: [{ kind: 'human', id: 'attacker', nick: '<img src=x onerror=alert(1)>' }], stage: 'wait' } });
      await new Promise(resolve => setTimeout(resolve, 100));
      bc.close();
      window.__smokeRoom.close();
      return accepted;
    });
    assert.equal(result, false, '恶意联机消息不应被接受');
    await page.close();
  }

  {
    const { page } = await open('doudizhu.html');
    const result = await page.evaluate(() => {
      window.mqtt = undefined;
      const room = NightNet.join('doudizhu', 'REVISION1');
      room.hostId = 'host';
      const applied = [];
      room.on('state', state => applied.push(state.rev));
      room._onMsg({ mid: 'revision-legacy', from: 'host', t: 'state', state: { phase: 'deal' } }, 'local');
      room._onMsg({ mid: 'revision-new', from: 'host', t: 'state', state: { rev: 4, phase: 'play' } }, 'local');
      room._onMsg({ mid: 'revision-repeat', from: 'host', t: 'state', state: { rev: 4, phase: 'play-repeat' } }, 'local');
      room._onMsg({ mid: 'revision-old', from: 'host', t: 'state', state: { rev: 3, phase: 'bid' } }, 'local');
      const denied = room.publishState({ phase: 'play' });
      room.hostId = NightNet.pid;
      const published = room.publishState({ phase: 'play' });
      const currentRevision = room.stateRevision;
      room.close();
      return { applied, denied, published, currentRevision };
    });
    assert.deepEqual(result, { applied: [0, 4], denied: false, published: 5, currentRevision: 5 }, '无版本旧快照应分配本地序号，新 revision 递增接受且重复或更旧版本丢弃');
    await page.close();
  }
} finally {
  await browser.close();
}

console.log('smoke tests passed');
