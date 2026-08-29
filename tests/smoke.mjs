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
} finally {
  await browser.close();
}

console.log('smoke tests passed');
