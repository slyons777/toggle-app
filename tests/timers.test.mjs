import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];

const KEY = 'toggle.expirations.v1';
const MIN = 60_000;
const T0 = Date.UTC(2026, 0, 1, 12, 0, 0);

class FakeElement {
  constructor() {
    this.cls = new Set();
    this.attrs = {};
    this.children = [];
    this.textContent = '';
    this.classList = {
      add: (...c) => c.forEach(x => this.cls.add(x)),
      remove: (...c) => c.forEach(x => this.cls.delete(x)),
      contains: c => this.cls.has(c),
    };
  }
  set className(v) { this.cls = new Set(v.split(/\s+/).filter(Boolean)); }
  set innerHTML(markup) {
    this.label = markup.match(/<\/span>([^<]*)<\/div>/)[1];
    this.button = new FakeElement();
    this.button.cls.add('toggle');
    this.button.attrs['aria-label'] = markup.match(/aria-label="([^"]*)"/)[1];
  }
  querySelector(sel) { return sel === 'button' ? this.button : null; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  appendChild(c) { this.children.push(c); }
}

const tick = () => new Promise(r => setImmediate(r));

// Launches a fresh copy of the app against a shared "device" (clock + storage).
async function launch(device, { native = true, source = script } = {}) {
  const timers = new Map();
  let nextId = 1;
  const listeners = {};
  const docListeners = {};
  const els = Object.fromEntries(
    ['notice', 'noticeIcon', 'noticeTitle', 'noticeMessage', 'mind', 'bounds'].map(id => [id, new FakeElement()])
  );
  const documentElement = new FakeElement();

  const FakeDate = class extends Date { static now() { return device.now; } };
  const Preferences = {
    get: async ({ key }) => ({ value: device.storage.has(key) ? device.storage.get(key) : null }),
    set: async ({ key, value }) => { device.storage.set(key, value); },
  };
  const App = {
    addListener: (ev, cb) => { listeners[ev] = cb; return Promise.resolve({ remove() {} }); },
  };
  const localStorage = {
    getItem: k => (device.storage.has(k) ? device.storage.get(k) : null),
    setItem: (k, v) => device.storage.set(k, String(v)),
  };

  const context = {
    Date: FakeDate,
    window: native ? { Capacitor: { Plugins: { Preferences, App } } } : {},
    localStorage,
    document: {
      documentElement,
      visibilityState: 'visible',
      getElementById: id => els[id],
      createElement: () => new FakeElement(),
      addEventListener: (ev, cb) => { docListeners[ev] = cb; },
    },
    setTimeout: (fn, ms) => { const id = nextId++; timers.set(id, { at: device.now + Math.max(0, ms || 0), fn }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => context.setTimeout(fn, 16),
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  await tick();

  const rows = [...els.mind.children, ...els.bounds.children];
  const button = name => {
    const row = rows.find(r => r.label === name);
    assert.ok(row, `no switch named ${name}`);
    return row.button;
  };

  const app = {
    items: vm.runInContext('items', context),
    els,
    rows,
    documentElement,
    isOff: name => button(name).classList.contains('off'),
    offNames: () => rows.filter(r => r.button.classList.contains('off')).map(r => r.label),
    tap: async name => { const b = button(name); b.onclick({ currentTarget: b }); await tick(); },
    // App stays in the foreground: time passes and due timers fire.
    runFor: async ms => {
      const end = device.now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        device.now = Math.max(device.now, due[1].at);
        due[1].fn();
        await tick();
      }
      device.now = end;
      await tick();
    },
    // iOS suspends the app: wall-clock time passes but no JS timers run.
    suspendFor: async ms => {
      if (listeners.appStateChange) listeners.appStateChange({ isActive: false });
      device.now += ms;
      await tick();
    },
    resume: async () => {
      if (listeners.appStateChange) listeners.appStateChange({ isActive: true });
      if (docListeners.visibilitychange) docListeners.visibilitychange();
      await tick();
    },
    hasAppListener: () => typeof listeners.appStateChange === 'function',
  };
  return app;
}

const newDevice = (storage = new Map()) => ({ now: T0, storage });
const stored = device => JSON.parse(device.storage.get(KEY) ?? '{}');

test('turning a switch off persists an absolute expiry and keeps existing banner behavior', async () => {
  const device = newDevice();
  const app = await launch(device);
  assert.equal(app.hasAppListener(), true);
  assert.equal(app.rows.length, 12);
  assert.deepEqual(app.offNames(), []);

  await app.tap('Overthinking');
  assert.equal(app.isOff('Overthinking'), true);
  assert.deepEqual(stored(device), { overthinking: T0 + 2 * MIN });
  assert.equal(app.els.noticeTitle.textContent, 'Overthinking');
  assert.equal(app.els.noticeMessage.textContent, "You don't need to solve this right now.");

  await app.runFor(100);
  assert.equal(app.els.notice.classList.contains('show'), true);
  await app.runFor(4500);
  assert.equal(app.els.notice.classList.contains('show'), false);
});

test('A: switch remains OFF when relaunched before expiry', async () => {
  const device = newDevice();
  await (await launch(device)).tap('Spiraling');

  device.now = T0 + 90_000;
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.offNames(), ['Spiraling']);
  assert.deepEqual(stored(device), { spiraling: T0 + 2 * MIN });
  assert.equal(relaunched.els.notice.classList.contains('show'), false, 'restoring must not replay the banner');

  await relaunched.runFor(29_999);
  assert.equal(relaunched.isOff('Spiraling'), true);
  await relaunched.runFor(1);
  assert.equal(relaunched.isOff('Spiraling'), false);
  assert.deepEqual(stored(device), {});
});

test('B: switch becomes ON after wall-clock expiry (relaunch and resume from suspension)', async () => {
  const device = newDevice();
  await (await launch(device)).tap('Assuming');

  device.now = T0 + 2 * MIN + 1;
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.offNames(), []);
  assert.deepEqual(stored(device), {}, 'stale expiry must be removed');

  const device2 = newDevice();
  const app = await launch(device2);
  await app.tap('Rabbit Hole');
  await app.suspendFor(10 * MIN);
  assert.equal(app.isOff('Rabbit Hole'), true, 'no timers ran while suspended');
  await app.resume();
  assert.equal(app.isOff('Rabbit Hole'), false);
  assert.deepEqual(stored(device2), {});
});

test('C: manual restore removes persisted expiry', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tap('Access');
  assert.deepEqual(stored(device), { access: T0 + 2 * MIN });

  await app.runFor(30_000);
  await app.tap('Access');
  assert.equal(app.isOff('Access'), false);
  assert.deepEqual(stored(device), {});

  await app.runFor(5 * MIN);
  assert.equal(app.isOff('Access'), false);

  const relaunched = await launch(device);
  assert.deepEqual(relaunched.offNames(), []);
});

test('D: multiple switches keep independent expiration timestamps', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tap('Overthinking');
  await app.runFor(30_000);
  await app.tap('Savior Mode');
  await app.runFor(30_000);
  await app.tap('Self-Criticism');
  assert.deepEqual(stored(device), {
    overthinking: T0 + 2 * MIN,
    'savior-mode': T0 + 30_000 + 2 * MIN,
    'self-criticism': T0 + 60_000 + 2 * MIN,
  });

  await app.tap('Savior Mode');
  assert.deepEqual(stored(device), {
    overthinking: T0 + 2 * MIN,
    'self-criticism': T0 + 60_000 + 2 * MIN,
  });

  device.now = T0 + 2 * MIN + 5_000;
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.offNames(), ['Self-Criticism']);
  assert.deepEqual(stored(device), { 'self-criticism': T0 + 60_000 + 2 * MIN });

  await relaunched.suspendFor(60_000);
  await relaunched.resume();
  assert.deepEqual(relaunched.offNames(), []);
  assert.deepEqual(stored(device), {});
});

test('corrupt or foreign stored data does not break launch', async () => {
  const device = newDevice(new Map([[KEY, 'not json']]));
  const app = await launch(device);
  assert.deepEqual(app.offNames(), []);
  await app.tap('Mental Noise');
  assert.deepEqual(stored(device), { 'mental-noise': T0 + 2 * MIN });

  const device2 = newDevice(new Map([[KEY, JSON.stringify({ overthinking: 'soon', 'unknown-switch': T0 + MIN })]]));
  const app2 = await launch(device2);
  assert.deepEqual(app2.offNames(), []);
  assert.deepEqual(stored(device2), { 'unknown-switch': T0 + MIN });
});

test('browser (PWA) fallback persists via localStorage', async () => {
  const device = newDevice();
  const app = await launch(device, { native: false });
  assert.equal(app.hasAppListener(), false);
  await app.tap('Need to Know');
  device.now = T0 + MIN;
  const relaunched = await launch(device, { native: false });
  assert.deepEqual(relaunched.offNames(), ['Need to Know']);
});

test('switch transitions are suppressed only while restoring saved state', async () => {
  const device = newDevice();
  const app = await launch(device);
  assert.equal(app.documentElement.classList.contains('restoring'), true);
  await app.runFor(40);
  assert.equal(app.documentElement.classList.contains('restoring'), false);
});

const STABLE_IDS = [
  'overthinking', 'spiraling', 'assuming', 'replaying-it', 'self-criticism', 'thinking-worst-case',
  'rabbit-hole', 'need-to-know', 'mental-noise', 'access', 'savior-mode', 'feeling-obligated',
];
// ID scheme used before explicit IDs existed; data saved by that build is keyed this way.
const legacySlug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

test('built-in switches declare the permanent explicit IDs', async () => {
  const app = await launch(newDevice());
  assert.deepEqual(Array.from(app.items, i => i.id), STABLE_IDS);
  assert.equal(new Set(STABLE_IDS).size, STABLE_IDS.length);
});

test('explicit IDs match the legacy name-derived IDs, so saved data needs no migration', async () => {
  const app = await launch(newDevice());
  for (const item of app.items) assert.equal(item.id, legacySlug(item.name), item.name);
});

test('saved data keyed by the existing IDs restores every switch', async () => {
  const saved = Object.fromEntries(STABLE_IDS.map((id, n) => [id, T0 + MIN + n * 1000]));
  const device = newDevice(new Map([[KEY, JSON.stringify(saved)]]));
  const app = await launch(device);
  assert.equal(app.offNames().length, 12);
  assert.deepEqual(stored(device), saved);

  await app.runFor(MIN + 7_500);
  assert.deepEqual(app.offNames(), ['Mental Noise', 'Access', 'Savior Mode', 'Feeling Obligated']);
  assert.deepEqual(Object.keys(stored(device)), ['mental-noise', 'access', 'savior-mode', 'feeling-obligated']);
});

test('changing a display label does not change persistent identity', async () => {
  const renamed = script.replace("name:'Overthinking'", "name:'Overthinking Again'");
  assert.notEqual(renamed, script, 'rename fixture must apply');

  const device = newDevice(new Map([[KEY, JSON.stringify({ overthinking: T0 + MIN })]]));
  const app = await launch(device, { source: renamed });
  assert.deepEqual(app.offNames(), ['Overthinking Again']);

  await app.tap('Overthinking Again');
  assert.deepEqual(stored(device), {});
  await app.tap('Overthinking Again');
  assert.deepEqual(stored(device), { overthinking: T0 + 2 * MIN });
  assert.equal(app.els.noticeTitle.textContent, 'Overthinking Again');
});
