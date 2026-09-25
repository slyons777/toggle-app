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
  get className() { return [...this.cls].join(' '); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) {
    if (c.parent) c.parent.children = c.parent.children.filter(x => x !== c);
    c.parent = this;
    this.children.push(c);
  }
  replaceChildren(...nodes) {
    this.children.forEach(c => { c.parent = null; });
    this.children = [];
    nodes.forEach(n => this.appendChild(n));
  }
  focus() { FakeElement.focused = this; }
  querySelector(sel) {
    const all = [this, ...this.children.flatMap(function walk(node) {
      return [node, ...node.children.flatMap(walk)];
    })];
    if (sel === 'button') return all.find(node => node.tag === 'button' || (node.className || '').includes('chooser-option') || node.classList.contains('chooser-option')) || null;
    return null;
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this);
    this.parent = null;
  }
}

// Row structure built by the app: row > [name > [icon, label], controls > [fav, toggle]].
const rowParts = row => ({
  row,
  label: row.children[0].children[1].textContent,
  icon: row.children[0].children[0].textContent,
  fav: row.children[1].children.find(c => c.classList.contains('fav')),
  button: row.children[1].children.find(c => c.classList.contains('toggle')),
  remove: row.children[1].children.find(c => c.classList.contains('remove')) || null,
});

const tick = () => new Promise(r => setImmediate(r));

// Launches a fresh copy of the app against a shared "device" (clock + storage).
async function launch(device, { native = true, source = script, haptics: hapticMode = 'ok', audio: audioMode = 'ok', reducedMotion = false } = {}) {
  const timers = new Map();
  let nextId = 1;
  const listeners = {};
  const docListeners = {};
  const els = Object.fromEntries(
    [
      'notice', 'noticeIcon', 'noticeTitle', 'noticeMessage', 'mind', 'bounds',
      'chooser', 'chooserBackdrop', 'chooserTitle', 'chooserOptions', 'chooserCancel',
      'quickAccess', 'quick',
      'mineSection', 'mine', 'createSwitch',
      'creator', 'creatorBackdrop', 'creatorTitle', 'creatorError', 'creatorFields', 'creatorForm', 'creatorCancel', 'creatorSave',
      'deleter', 'deleterBackdrop', 'deleterSheet', 'deleterTitle', 'deleterConfirm', 'deleterCancel',
      'shutdownEntry', 'shutdownView', 'shutdownRemaining', 'shutdownSoundName',
      'shutdownSoundButton', 'shutdownTimeButton', 'shutdownTransitionButton', 'shutdownEnd',
      'shutdownTimeSheet', 'shutdownTimeTitle', 'shutdownTimeOptions', 'shutdownTimeCancel', 'shutdownTimeBackdrop',
      'shutdownSoundSheet', 'shutdownSoundTitle', 'shutdownSoundOptions', 'shutdownSoundCancel', 'shutdownSoundBackdrop',
      'shutdownTransitionSheet', 'shutdownTransitionTitle', 'shutdownTransitionOptions', 'shutdownTransitionCancel', 'shutdownTransitionBackdrop',
      'shutdownEphemeral', 'shutdownHapticsButton',
    ].map(id => [id, new FakeElement()])
  );
  const documentElement = new FakeElement();
  const phone = new FakeElement();
  FakeElement.focused = null;

  const FakeDate = class extends Date { static now() { return device.now; } };
  const Preferences = {
    get: async ({ key }) => ({ value: device.storage.has(key) ? device.storage.get(key) : null }),
    set: async ({ key, value }) => { device.storage.set(key, value); },
  };
  const App = {
    addListener: (ev, cb) => { listeners[ev] = cb; return Promise.resolve({ remove() {} }); },
  };
  const haptics = [];
  const Haptics = {
    impact: ({ style }) => {
      haptics.push(style);
      if (hapticMode === 'reject') return Promise.reject(new Error('haptics unavailable'));
      if (hapticMode === 'throw') throw new Error('haptics bridge error');
      return Promise.resolve();
    },
  };
  const audioLog = [];
  const loaded = new Set();
  const looping = new Set();
  const NativeAudio = {
    configure: async options => { audioLog.push(['configure', options]); if (audioMode === 'configure-fail') throw new Error('configure failed'); },
    preload: async options => { audioLog.push(['preload', options.assetId, options.volume]); if (audioMode === 'fail') throw new Error('preload failed'); loaded.add(options.assetId); },
    loop: async ({ assetId }) => { audioLog.push(['loop', assetId]); if (audioMode === 'fail') throw new Error('loop failed'); looping.add(assetId); },
    play: async ({ assetId, volume }) => { audioLog.push(['play', assetId, volume]); if (audioMode === 'fail') throw new Error('play failed'); },
    setVolume: async ({ assetId, volume, duration }) => { audioLog.push(['setVolume', assetId, volume, duration || 0]); },
    stop: async ({ assetId }) => { audioLog.push(['stop', assetId]); looping.delete(assetId); },
    unload: async ({ assetId }) => { audioLog.push(['unload', assetId]); loaded.delete(assetId); },
  };
  const localStorage = {
    getItem: k => (device.storage.has(k) ? device.storage.get(k) : null),
    setItem: (k, v) => device.storage.set(k, String(v)),
  };

  const context = {
    Date: FakeDate,
    window: {
      ...(native ? { Capacitor: { Plugins: { Preferences, App, Haptics, NativeAudio } } } : {}),
      matchMedia: query => ({ matches: reducedMotion && String(query).includes('prefers-reduced-motion') }),
    },
    Audio: native ? undefined : function BrowserAudio(src) {
      this.src = src;
      this.loop = false;
      this.volume = 1;
      this.play = async () => { audioLog.push(['browser-play', src, this.volume, this.loop]); };
      this.pause = () => { audioLog.push(['browser-pause', src]); };
    },
    localStorage,
    document: {
      documentElement,
      visibilityState: 'visible',
      getElementById: id => els[id],
      querySelector: sel => (sel === '.phone' ? phone : null),
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

  const rows = [...els.mind.children, ...els.bounds.children].map(rowParts);
  const quickRows = () => els.quick.children.map(rowParts);
  const mineRows = () => els.mine.children.map(rowParts);
  const walk = node => [node, ...node.children.flatMap(walk)];
  const field = cls => walk(els.creatorFields).find(n => n.classList.contains(cls));
  const durationInputs = () => walk(els.creatorFields).filter(n => n.classList.contains('custom-duration'));
  const find = (list, name, where) => {
    const row = list.find(r => r.label === name);
    assert.ok(row, `no ${where} row named ${name}`);
    return row;
  };
  const button = name => find(rows, name, 'normal').button;
  const quickButton = name => find(quickRows(), name, 'Quick Access').button;

  const app = {
    items: vm.runInContext('items', context),
    haptics,
    audioLog,
    looping: () => [...looping],
    els,
    rows,
    documentElement,
    isOff: name => button(name).classList.contains('off'),
    offNames: () => rows.filter(r => r.button.classList.contains('off')).map(r => r.label),
    phone,
    button,
    quickButton,
    quickNames: () => quickRows().map(r => r.label),
    quickVisible: () => els.quickAccess.hidden === false && els.quick.children.length > 0,
    favButton: (name, where = 'normal') => {
      const list = where === 'quick' ? quickRows() : where === 'mine' ? mineRows() : rows;
      const place = where === 'quick' ? 'Quick Access' : where === 'mine' ? 'My Switches' : 'normal';
      return find(list, name, place).fav;
    },
    tapFavorite: async (name, where = 'normal') => { app.favButton(name, where).onclick(); await tick(); },
    mineNames: () => mineRows().map(r => r.label),
    mineVisible: () => els.mineSection.hidden === false && els.mine.children.length > 0,
    mineButton: name => find(mineRows(), name, 'My Switches').button,
    isMineOff: name => app.mineButton(name).classList.contains('off'),
    pressMine: async name => { app.mineButton(name).onclick(); await tick(); },
    mineRow: name => find(mineRows(), name, 'My Switches'),
    openCreate: async () => { els.createSwitch.onclick(); await tick(); },
    creatorOpen: () => els.creator.classList.contains('show'),
    creatorError: () => els.creatorError.textContent,
    fillCreate: ({ name = '', message = '', icon = '', minutes = 2 } = {}) => {
      field('custom-name').value = name;
      field('custom-message').value = message;
      field('custom-icon').value = icon;
      durationInputs().forEach(input => { input.checked = input.minutes === minutes; });
    },
    submitCreate: async () => { els.creatorForm.onsubmit({ preventDefault() {} }); await tick(); },
    cancelCreate: async () => { els.creatorCancel.onclick(); await tick(); },
    createCustom: async fields => { await app.openCreate(); app.fillCreate(fields); await app.submitCreate(); },
    deleterOpen: () => els.deleter.classList.contains('show'),
    deleterTitle: () => els.deleterTitle.textContent,
    askDelete: async name => { app.mineRow(name).remove.onclick(); await tick(); },
    confirmDelete: async () => { els.deleterConfirm.onclick(); await tick(); },
    cancelDelete: async () => { els.deleterCancel.onclick(); await tick(); },
    shutdownActive: () => els.shutdownView.hidden === false,
    startShutdown: async () => { els.shutdownEntry.onclick(); await tick(); },
    endShutdown: async () => { els.shutdownEnd.onclick(); await tick(); },
    shutdownChoice: async (sheetId, optionsId, label) => {
      els[`${sheetId}Button`].onclick();
      await tick();
      const option = els[optionsId].children.find(node => node.textContent === label);
      assert.ok(option, `no Shutdown option ${label}`);
      option.onclick();
      await tick();
    },
    isQuickOff: name => quickButton(name).classList.contains('off'),
    pressQuick: async name => { quickButton(name).onclick(); await tick(); },
    pendingTimers: () => timers.size,
    focused: () => FakeElement.focused,
    // Raw tap on a switch, exactly what the user's finger does.
    press: async name => { const b = button(name); b.onclick(); await tick(); },
    // Full user action: ON -> choose a duration -> OFF, or OFF -> ON.
    toggle: async (name, minutes = 2) => {
      const wasOff = app.isOff(name);
      await app.press(name);
      if (!wasOff) await app.choose(`${minutes} minutes`);
    },
    chooserOpen: () => els.chooser.classList.contains('show'),
    chooserTitle: () => els.chooserTitle.textContent,
    chooserLabels: () => els.chooserOptions.children.map(b => b.textContent),
    choose: async label => {
      const b = els.chooserOptions.children.find(o => o.textContent === label);
      assert.ok(b, `no duration option ${label}`);
      b.onclick();
      await tick();
    },
    cancel: async () => { els.chooserCancel.onclick(); await tick(); },
    tapBackdrop: async () => { els.chooserBackdrop.onclick(); await tick(); },
    pressEscape: async () => { docListeners.keydown({ key: 'Escape' }); await tick(); },
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

  await app.toggle('Overthinking');
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
  await (await launch(device)).toggle('Spiraling');

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
  await (await launch(device)).toggle('Assuming');

  device.now = T0 + 2 * MIN + 1;
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.offNames(), []);
  assert.deepEqual(stored(device), {}, 'stale expiry must be removed');

  const device2 = newDevice();
  const app = await launch(device2);
  await app.toggle('Rabbit Hole');
  await app.suspendFor(10 * MIN);
  assert.equal(app.isOff('Rabbit Hole'), true, 'no timers ran while suspended');
  await app.resume();
  assert.equal(app.isOff('Rabbit Hole'), false);
  assert.deepEqual(stored(device2), {});
});

test('C: manual restore removes persisted expiry', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.toggle('Access');
  assert.deepEqual(stored(device), { access: T0 + 2 * MIN });

  await app.runFor(30_000);
  await app.toggle('Access');
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
  await app.toggle('Overthinking');
  await app.runFor(30_000);
  await app.toggle('Savior Mode');
  await app.runFor(30_000);
  await app.toggle('Self-Criticism');
  assert.deepEqual(stored(device), {
    overthinking: T0 + 2 * MIN,
    'savior-mode': T0 + 30_000 + 2 * MIN,
    'self-criticism': T0 + 60_000 + 2 * MIN,
  });

  await app.toggle('Savior Mode');
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
  await app.toggle('Mental Noise');
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
  await app.toggle('Need to Know');
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

  await app.toggle('Overthinking Again');
  assert.deepEqual(stored(device), {});
  await app.toggle('Overthinking Again');
  assert.deepEqual(stored(device), { overthinking: T0 + 2 * MIN });
  assert.equal(app.els.noticeTitle.textContent, 'Overthinking Again');
});

test('haptics A: manually turning ON -> OFF requests one medium impact', async () => {
  const app = await launch(newDevice());
  await app.toggle('Spiraling');
  assert.deepEqual(app.haptics, ['MEDIUM']);
});

test('haptics B: manually turning OFF -> ON requests one light impact', async () => {
  const app = await launch(newDevice());
  await app.toggle('Spiraling');
  app.haptics.length = 0;
  await app.toggle('Spiraling');
  assert.equal(app.isOff('Spiraling'), false);
  assert.deepEqual(app.haptics, ['LIGHT']);
});

test('haptics C: automatic timer expiry and resume reconciliation request no haptic', async () => {
  const app = await launch(newDevice());
  await app.toggle('Assuming');
  await app.toggle('Access');
  app.haptics.length = 0;

  await app.runFor(2 * MIN);
  assert.equal(app.isOff('Assuming'), false);
  assert.equal(app.isOff('Access'), false);
  assert.deepEqual(app.haptics, []);

  await app.toggle('Rabbit Hole');
  app.haptics.length = 0;
  await app.suspendFor(10 * MIN);
  await app.resume();
  assert.equal(app.isOff('Rabbit Hole'), false);
  assert.deepEqual(app.haptics, []);
});

test('haptics D: launch/restore reconciliation requests no haptic', async () => {
  const saved = { overthinking: T0 + MIN, access: T0 - 1, 'savior-mode': T0 + 2 * MIN };
  const device = newDevice(new Map([[KEY, JSON.stringify(saved)]]));
  const app = await launch(device);
  assert.deepEqual(app.offNames(), ['Overthinking', 'Savior Mode']);
  assert.deepEqual(stored(device), { overthinking: T0 + MIN, 'savior-mode': T0 + 2 * MIN });
  await app.runFor(40);
  assert.deepEqual(app.haptics, []);
});

test('haptics E: a rejected or throwing haptic call does not prevent the switch state change', async () => {
  for (const mode of ['reject', 'throw']) {
    const device = newDevice();
    const app = await launch(device, { haptics: mode });

    await app.toggle('Need to Know');
    assert.equal(app.isOff('Need to Know'), true, mode);
    assert.deepEqual(stored(device), { 'need-to-know': T0 + 2 * MIN }, mode);
    assert.equal(app.els.noticeTitle.textContent, 'Need to Know', mode);

    await app.toggle('Need to Know');
    assert.equal(app.isOff('Need to Know'), false, mode);
    assert.deepEqual(stored(device), {}, mode);
    assert.deepEqual(app.haptics, ['MEDIUM', 'LIGHT'], mode);
  }
});

test('haptics are skipped entirely when the plugin is unavailable (browser)', async () => {
  const app = await launch(newDevice(), { native: false });
  await app.toggle('Mental Noise');
  assert.equal(app.isOff('Mental Noise'), true);
  assert.deepEqual(app.haptics, []);
});

test('tapping an ON switch opens the duration chooser without changing anything yet', async () => {
  const device = newDevice();
  const app = await launch(device);
  assert.equal(app.chooserOpen(), false);
  assert.match(html, /<div id="chooser" class="chooser" aria-hidden="true">/);
  assert.match(html, /role="dialog" aria-modal="true" aria-labelledby="chooserTitle"/);

  await app.press('Overthinking');
  assert.equal(app.chooserOpen(), true);
  assert.equal(app.els.chooser.getAttribute('aria-hidden'), 'false');
  assert.equal(app.chooserTitle(), 'Pause Overthinking for…');
  assert.deepEqual(app.chooserLabels(), ['2 minutes', '5 minutes', '15 minutes', '30 minutes']);
  assert.equal(app.phone.inert, true, 'rest of the app is inert while the sheet is open');
  assert.equal(app.focused(), app.els.chooserOptions.children[0]);

  assert.equal(app.isOff('Overthinking'), false);
  assert.equal(device.storage.has(KEY), false);
  assert.deepEqual(app.haptics, []);
  await app.runFor(100);
  assert.equal(app.els.notice.classList.contains('show'), false);
});

for (const [letter, minutes, ms] of [['A', 2, 120_000], ['B', 5, 300_000], ['C', 15, 900_000], ['D', 30, 1_800_000]]) {
  test(`durations ${letter}: choosing ${minutes} minutes saves now + ${ms}`, async () => {
    const device = newDevice();
    const app = await launch(device);
    await app.runFor(7_000);
    const now = device.now;

    await app.press('Savior Mode');
    await app.choose(`${minutes} minutes`);
    assert.equal(app.chooserOpen(), false);
    assert.equal(app.phone.inert, false);
    assert.equal(app.focused(), app.button('Savior Mode'), 'focus returns to the switch');
    assert.equal(app.isOff('Savior Mode'), true);
    assert.deepEqual(stored(device), { 'savior-mode': now + ms });
    assert.equal(app.els.noticeTitle.textContent, 'Savior Mode');
    assert.equal(app.els.noticeMessage.textContent, 'You can care without carrying it.');
    await app.runFor(100);
    assert.equal(app.els.notice.classList.contains('show'), true);

    await app.runFor(ms - 100 - 1);
    assert.equal(app.isOff('Savior Mode'), true);
    await app.runFor(1);
    assert.equal(app.isOff('Savior Mode'), false);
    assert.deepEqual(stored(device), {});
  });
}

test('durations: a longer pause survives relaunch and expires at its own time', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.toggle('Access', 30);
  await app.toggle('Spiraling', 5);

  device.now = T0 + 10 * MIN;
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.offNames(), ['Access']);
  assert.deepEqual(stored(device), { access: T0 + 30 * MIN });
});

test('durations E: cancel leaves the switch ON and writes nothing (button, backdrop, Escape)', async () => {
  for (const dismiss of ['cancel', 'tapBackdrop', 'pressEscape']) {
    const device = newDevice();
    const app = await launch(device);
    await app.press('Rabbit Hole');
    assert.equal(app.chooserOpen(), true, dismiss);

    await app[dismiss]();
    assert.equal(app.chooserOpen(), false, dismiss);
    assert.equal(app.phone.inert, false, dismiss);
    assert.equal(app.focused(), app.button('Rabbit Hole'), dismiss);
    assert.equal(app.isOff('Rabbit Hole'), false, dismiss);
    assert.equal(device.storage.has(KEY), false, dismiss);
    assert.deepEqual(app.haptics, [], dismiss);
    await app.runFor(5_000);
    assert.equal(app.els.notice.classList.contains('show'), false, dismiss);
    assert.equal(app.els.noticeTitle.textContent, '', dismiss);
  }
});

test('durations F: manual restore from OFF skips the duration chooser', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.toggle('Assuming', 15);
  app.haptics.length = 0;

  await app.press('Assuming');
  assert.equal(app.chooserOpen(), false);
  assert.equal(app.isOff('Assuming'), false);
  assert.deepEqual(stored(device), {});
  assert.deepEqual(app.haptics, ['LIGHT']);
});

test('durations G: medium haptic happens only after a duration is confirmed', async () => {
  const app = await launch(newDevice());
  await app.press('Feeling Obligated');
  assert.deepEqual(app.haptics, []);
  await app.choose('5 minutes');
  assert.deepEqual(app.haptics, ['MEDIUM']);

  await app.press('Mental Noise');
  await app.cancel();
  assert.deepEqual(app.haptics, ['MEDIUM']);
});

test('durations: the chooser works in the plain browser fallback', async () => {
  const device = newDevice();
  const app = await launch(device, { native: false });
  await app.press('Need to Know');
  assert.equal(app.chooserTitle(), 'Pause Need to Know for…');
  await app.choose('15 minutes');
  assert.equal(app.isOff('Need to Know'), true);
  assert.deepEqual(stored(device), { 'need-to-know': T0 + 15 * MIN });
});

const FAV_KEY = 'toggle.favorites.v1';
const storedFavs = device => JSON.parse(device.storage.get(FAV_KEY) ?? 'null');

test('favorites A: favoriting a switch persists its stable ID', async () => {
  const device = newDevice();
  const app = await launch(device);
  const star = app.favButton('Overthinking');
  assert.equal(app.quickVisible(), false, 'no empty Quick Access section');
  assert.equal(star.textContent, '☆');
  assert.equal(star.getAttribute('aria-pressed'), 'false');
  assert.equal(star.getAttribute('aria-label'), 'Add Overthinking to favorites');
  assert.equal(device.storage.has(FAV_KEY), false);

  await app.tapFavorite('Overthinking');
  assert.deepEqual(storedFavs(device), ['overthinking']);
  assert.equal(star.textContent, '★');
  assert.equal(star.getAttribute('aria-pressed'), 'true');
  assert.equal(star.getAttribute('aria-label'), 'Remove Overthinking from favorites');
  assert.equal(app.quickVisible(), true);
  assert.deepEqual(app.quickNames(), ['Overthinking']);
  assert.equal(app.favButton('Overthinking', 'quick').textContent, '★');
});

test('favorites B: favorites restore after relaunch', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Mental Noise');
  await app.tapFavorite('Access');

  const relaunched = await launch(device);
  assert.equal(relaunched.quickVisible(), true);
  assert.deepEqual(relaunched.quickNames(), ['Mental Noise', 'Access']);
  assert.equal(relaunched.favButton('Access').getAttribute('aria-pressed'), 'true');
  assert.equal(relaunched.favButton('Overthinking').getAttribute('aria-pressed'), 'false');
});

test('favorites C: unfavoriting removes only that favorite (from either row)', async () => {
  const device = newDevice();
  const app = await launch(device);
  for (const name of ['Overthinking', 'Mental Noise', 'Access']) await app.tapFavorite(name);

  await app.tapFavorite('Mental Noise');
  assert.deepEqual(storedFavs(device), ['overthinking', 'access']);
  assert.deepEqual(app.quickNames(), ['Overthinking', 'Access']);
  assert.equal(app.favButton('Mental Noise').textContent, '☆');

  await app.tapFavorite('Access', 'quick');
  assert.deepEqual(storedFavs(device), ['overthinking']);
  assert.deepEqual(app.quickNames(), ['Overthinking']);
  assert.equal(app.focused(), app.favButton('Access'), 'focus moves to the remaining star');

  await app.tapFavorite('Overthinking', 'quick');
  assert.deepEqual(storedFavs(device), []);
  assert.equal(app.quickVisible(), false);
});

test('favorites D: favorite order is preserved', async () => {
  const device = newDevice();
  const app = await launch(device);
  for (const name of ['Access', 'Overthinking', 'Feeling Obligated', 'Spiraling']) await app.tapFavorite(name);
  assert.deepEqual(app.quickNames(), ['Access', 'Overthinking', 'Feeling Obligated', 'Spiraling']);
  assert.deepEqual(storedFavs(device), ['access', 'overthinking', 'feeling-obligated', 'spiraling']);

  await app.tapFavorite('Overthinking');
  await app.tapFavorite('Overthinking');
  assert.deepEqual(app.quickNames(), ['Access', 'Feeling Obligated', 'Spiraling', 'Overthinking']);

  const relaunched = await launch(device);
  assert.deepEqual(relaunched.quickNames(), ['Access', 'Feeling Obligated', 'Spiraling', 'Overthinking']);
});

test('favorites E: favoriting does not alter switch state, timers, banner or haptics', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.toggle('Spiraling', 15);
  await app.runFor(100);
  const before = {
    off: app.offNames(),
    expirations: device.storage.get(KEY),
    timers: app.pendingTimers(),
    haptics: [...app.haptics],
    bannerShown: app.els.notice.classList.contains('show'),
    bannerTitle: app.els.noticeTitle.textContent,
  };
  assert.equal(before.bannerShown, true);

  for (const name of ['Spiraling', 'Assuming', 'Spiraling', 'Assuming', 'Spiraling']) await app.tapFavorite(name);
  await app.tapFavorite('Spiraling', 'quick');
  await app.tapFavorite('Spiraling');

  assert.deepEqual(app.offNames(), before.off);
  assert.equal(device.storage.get(KEY), before.expirations);
  assert.equal(app.pendingTimers(), before.timers);
  assert.deepEqual(app.haptics, before.haptics);
  assert.equal(app.els.notice.classList.contains('show'), before.bannerShown);
  assert.equal(app.els.noticeTitle.textContent, before.bannerTitle);
  assert.equal(app.chooserOpen(), false, 'favoriting never opens the duration chooser');
  assert.equal(app.isOff('Assuming'), false);
});

test('favorites F: a favorited OFF switch shows OFF in Quick Access and its normal section', async () => {
  const device = newDevice(new Map([
    [KEY, JSON.stringify({ overthinking: T0 + 5 * MIN })],
    [FAV_KEY, JSON.stringify(['overthinking', 'access'])],
  ]));
  const app = await launch(device);
  assert.equal(app.isOff('Overthinking'), true);
  assert.equal(app.isQuickOff('Overthinking'), true);
  assert.equal(app.quickButton('Overthinking').getAttribute('aria-label'), 'Turn on Overthinking');
  assert.equal(app.isOff('Access'), false);
  assert.equal(app.isQuickOff('Access'), false);
});

test('favorites G: pausing from Quick Access updates the normal representation', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Rabbit Hole');

  await app.pressQuick('Rabbit Hole');
  assert.equal(app.chooserTitle(), 'Pause Rabbit Hole for…');
  assert.deepEqual(app.haptics, []);
  await app.choose('5 minutes');

  assert.equal(app.isQuickOff('Rabbit Hole'), true);
  assert.equal(app.isOff('Rabbit Hole'), true);
  assert.equal(app.button('Rabbit Hole').getAttribute('aria-label'), 'Turn on Rabbit Hole');
  assert.deepEqual(stored(device), { 'rabbit-hole': T0 + 5 * MIN }, 'one timer keyed by the stable ID');
  assert.deepEqual(app.haptics, ['MEDIUM']);
  assert.equal(app.els.noticeTitle.textContent, 'Rabbit Hole');
  assert.equal(app.focused(), app.quickButton('Rabbit Hole'), 'focus returns to the tapped copy');
});

test('favorites H: manually restoring from Quick Access updates the normal representation', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Self-Criticism');
  await app.toggle('Self-Criticism', 30);
  assert.equal(app.isQuickOff('Self-Criticism'), true);
  app.haptics.length = 0;

  await app.pressQuick('Self-Criticism');
  assert.equal(app.chooserOpen(), false);
  assert.equal(app.isQuickOff('Self-Criticism'), false);
  assert.equal(app.isOff('Self-Criticism'), false);
  assert.deepEqual(stored(device), {});
  assert.deepEqual(app.haptics, ['LIGHT']);
});

test('favorites I: automatic timer expiry updates both representations', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Assuming');
  await app.tapFavorite('Access');
  await app.toggle('Assuming', 2);
  await app.pressQuick('Access');
  await app.choose('5 minutes');
  app.haptics.length = 0;

  await app.runFor(2 * MIN);
  assert.equal(app.isOff('Assuming'), false);
  assert.equal(app.isQuickOff('Assuming'), false);
  assert.equal(app.isOff('Access'), true);
  assert.equal(app.isQuickOff('Access'), true);

  await app.suspendFor(3 * MIN);
  await app.resume();
  assert.equal(app.isOff('Access'), false);
  assert.equal(app.isQuickOff('Access'), false);
  assert.deepEqual(stored(device), {});
  assert.deepEqual(app.haptics, []);
});

test('favorites J: unfavoriting an actively paused switch does not cancel or alter its timer', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Savior Mode');
  await app.pressQuick('Savior Mode');
  await app.choose('15 minutes');
  const timers = app.pendingTimers();

  await app.tapFavorite('Savior Mode', 'quick');
  assert.deepEqual(app.quickNames(), []);
  assert.equal(app.isOff('Savior Mode'), true);
  assert.deepEqual(stored(device), { 'savior-mode': T0 + 15 * MIN });
  assert.equal(app.pendingTimers(), timers);

  await app.tapFavorite('Savior Mode');
  assert.equal(app.isQuickOff('Savior Mode'), true, 're-favorited copy shows the live state');

  await app.runFor(15 * MIN - 1);
  assert.equal(app.isOff('Savior Mode'), true);
  await app.runFor(1);
  assert.equal(app.isOff('Savior Mode'), false);
  assert.equal(app.isQuickOff('Savior Mode'), false);
  assert.deepEqual(stored(device), {});
});

test('favorites K: unknown or corrupt favorite data does not break launch', async () => {
  const cases = [
    ['not json', []],
    [JSON.stringify({ overthinking: true }), []],
    [JSON.stringify('overthinking'), []],
    [JSON.stringify([1, null, 'nope', 'constructor', 'overthinking', 'overthinking', 'access']), ['Overthinking', 'Access']],
  ];
  for (const [raw, expected] of cases) {
    const device = newDevice(new Map([
      [FAV_KEY, raw],
      [KEY, JSON.stringify({ spiraling: T0 + MIN })],
    ]));
    const app = await launch(device);
    assert.deepEqual(app.quickNames(), expected, raw);
    assert.equal(app.quickVisible(), expected.length > 0, raw);
    assert.deepEqual(app.offNames(), ['Spiraling'], `timers still restore: ${raw}`);

    await app.tapFavorite('Need to Know');
    assert.deepEqual(app.quickNames(), [...expected, 'Need to Know'], raw);
  }
});

const CUSTOM_KEY = 'toggle.custom-switches.v1';
const storedCustoms = device => JSON.parse(device.storage.get(CUSTOM_KEY) ?? 'null');

test('custom A: creating a valid custom switch persists every field', async () => {
  const device = newDevice();
  const app = await launch(device);
  assert.equal(app.mineVisible(), false);
  await app.openCreate();
  assert.equal(app.creatorOpen(), true);
  assert.equal(app.phone.inert, true);
  await app.submitCreate();
  assert.equal(app.creatorOpen(), true, 'empty form does not save');
  assert.equal(app.creatorError(), 'Add a name.');
  assert.equal(device.storage.has(CUSTOM_KEY), false);

  app.fillCreate({ name: '  Late Night  ', message: '  Rest is allowed.  ', icon: '', minutes: 15 });
  await app.submitCreate();
  assert.equal(app.creatorOpen(), false);
  assert.equal(app.mineVisible(), true);
  assert.deepEqual(app.mineNames(), ['Late Night']);
  const [saved] = storedCustoms(device);
  assert.equal(saved.name, 'Late Night');
  assert.equal(saved.message, 'Rest is allowed.');
  assert.equal(saved.icon, '✨');
  assert.equal(saved.defaultDurationMinutes, 15);
  assert.match(saved.id, /^custom-[A-Za-z0-9-]{8,}$/);
  assert.equal(app.mineRow('Late Night').icon, '✨');
  assert.equal(app.mineRow('Late Night').remove.getAttribute('aria-label'), 'Delete Late Night');
});

test('custom B: a custom switch restores after relaunch', async () => {
  const device = newDevice();
  await (await launch(device)).createCustom({ name: 'Late Night', message: 'Rest is allowed.', icon: '🌙', minutes: 5 });
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.mineNames(), ['Late Night']);
  assert.equal(relaunched.mineRow('Late Night').icon, '🌙');
  assert.equal(storedCustoms(device)[0].message, 'Rest is allowed.');
});

test('custom C: the permanent id is not derived from the visible name', async () => {
  const device = newDevice();
  await (await launch(device)).createCustom({ name: 'Deep Breath', message: 'You can pause.', minutes: 2 });
  const saved = storedCustoms(device)[0];
  assert.equal(saved.id.startsWith('custom-'), true);
  assert.equal(saved.id.includes('deep-breath'), false);
  assert.notEqual(saved.id, 'deep-breath');
});

test('custom D: multiple custom switches receive unique ids', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Same', message: 'First one.', minutes: 2 });
  await app.createCustom({ name: 'Same', message: 'Second one.', minutes: 30 });
  const [first, second] = storedCustoms(device);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(app.mineNames(), ['Same', 'Same']);
  assert.equal(first.message, 'First one.');
  assert.equal(second.message, 'Second one.');
});

test('custom E: the default duration persists', async () => {
  const device = newDevice();
  await (await launch(device)).createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 30 });
  assert.equal(storedCustoms(device)[0].defaultDurationMinutes, 30);
  const relaunched = await launch(device);
  assert.equal(storedCustoms(device)[0].defaultDurationMinutes, 30);
  await relaunched.pressMine('Focus');
  assert.equal(relaunched.chooserLabels()[0], '30 minutes · Default');
});

test('custom F: tapping it opens the normal duration chooser and does not pause yet', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 15 });
  await app.pressMine('Focus');
  assert.equal(app.chooserOpen(), true);
  assert.equal(app.chooserTitle(), 'Pause Focus for…');
  assert.deepEqual(app.chooserLabels(), ['15 minutes · Default', '2 minutes', '5 minutes', '30 minutes']);
  assert.equal(app.isMineOff('Focus'), false);
  assert.equal(device.storage.has(KEY), false);
  assert.deepEqual(app.haptics, []);
});

test('custom G: choosing a duration saves an expiration under the custom id', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Deep Breath', message: 'You can pause.', icon: '🌙', minutes: 5 });
  const id = storedCustoms(device)[0].id;
  await app.runFor(1000);
  const now = device.now;
  await app.pressMine('Deep Breath');
  await app.choose('30 minutes');
  assert.equal(app.isMineOff('Deep Breath'), true);
  assert.deepEqual(stored(device), { [id]: now + 30 * MIN });
  assert.equal(Object.hasOwn(stored(device), 'deep-breath'), false);
  assert.deepEqual(app.haptics, ['MEDIUM']);
  assert.equal(app.els.noticeTitle.textContent, 'Deep Breath');
  assert.equal(app.els.noticeMessage.textContent, 'You can pause.');
  assert.equal(app.els.noticeIcon.textContent, '🌙');
});

test('custom H: its timer survives relaunch', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 2 });
  const id = storedCustoms(device)[0].id;
  await app.pressMine('Focus');
  await app.choose('5 minutes');
  device.now = T0 + MIN;
  const relaunched = await launch(device);
  assert.equal(relaunched.isMineOff('Focus'), true);
  assert.deepEqual(stored(device), { [id]: T0 + 5 * MIN });
});

test('custom I: manual restore clears its expiration', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 15 });
  await app.pressMine('Focus');
  await app.choose('15 minutes · Default');
  app.haptics.length = 0;
  await app.pressMine('Focus');
  assert.equal(app.chooserOpen(), false);
  assert.equal(app.isMineOff('Focus'), false);
  assert.deepEqual(stored(device), {});
  assert.deepEqual(app.haptics, ['LIGHT']);
});

test('custom J: automatic expiry turns it back on', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 2 });
  await app.pressMine('Focus');
  await app.choose('2 minutes · Default');
  app.haptics.length = 0;
  await app.runFor(2 * MIN - 1);
  assert.equal(app.isMineOff('Focus'), true);
  await app.runFor(1);
  assert.equal(app.isMineOff('Focus'), false);
  assert.deepEqual(stored(device), {});
  assert.deepEqual(app.haptics, []);
});

test('custom K: a custom switch can be favorited', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Late Night', message: 'Rest is allowed.', minutes: 2 });
  const id = storedCustoms(device)[0].id;
  await app.tapFavorite('Late Night', 'mine');
  assert.deepEqual(storedFavs(device), [id]);
  assert.deepEqual(app.quickNames(), ['Late Night']);
  assert.equal(app.favButton('Late Night', 'quick').getAttribute('aria-pressed'), 'true');
  assert.equal(app.isMineOff('Late Night'), false);
  assert.deepEqual(app.haptics, []);
});

test('custom L: a custom favorite restores after relaunch', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Access');
  await app.createCustom({ name: 'Late Night', message: 'Rest is allowed.', minutes: 2 });
  await app.tapFavorite('Late Night', 'mine');
  const id = storedCustoms(device)[0].id;
  const relaunched = await launch(device);
  assert.deepEqual(storedFavs(device), ['access', id]);
  assert.deepEqual(relaunched.quickNames(), ['Access', 'Late Night']);
});

test('custom M: Quick Access and My Switches reflect the same state', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 5 });
  await app.tapFavorite('Focus', 'mine');
  const id = storedCustoms(device)[0].id;
  await app.pressQuick('Focus');
  await app.choose('5 minutes · Default');
  assert.equal(app.isQuickOff('Focus'), true);
  assert.equal(app.isMineOff('Focus'), true);
  assert.deepEqual(Object.keys(stored(device)), [id]);
  app.haptics.length = 0;
  await app.pressMine('Focus');
  assert.equal(app.isMineOff('Focus'), false);
  assert.equal(app.isQuickOff('Focus'), false);
  assert.deepEqual(stored(device), {});
  assert.deepEqual(app.haptics, ['LIGHT']);
});

test('custom N: unfavoriting does not affect its timer', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 15 });
  await app.tapFavorite('Focus', 'mine');
  await app.pressQuick('Focus');
  await app.choose('15 minutes · Default');
  const id = storedCustoms(device)[0].id;
  const expiry = stored(device)[id];
  await app.tapFavorite('Focus', 'quick');
  assert.deepEqual(app.quickNames(), []);
  assert.equal(app.isMineOff('Focus'), true);
  assert.equal(stored(device)[id], expiry);
  await app.runFor(15 * MIN - 1);
  assert.equal(app.isMineOff('Focus'), true);
  await app.runFor(1);
  assert.equal(app.isMineOff('Focus'), false);
});

test('custom O: deleting removes the custom record', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Late Night', message: 'Rest is allowed.', minutes: 2 });
  await app.askDelete('Late Night');
  assert.equal(app.deleterOpen(), true);
  assert.equal(app.deleterTitle(), 'Delete Late Night?');
  assert.equal(app.phone.inert, true);
  await app.confirmDelete();
  assert.equal(app.deleterOpen(), false);
  assert.deepEqual(storedCustoms(device), []);
  assert.equal(app.mineVisible(), false);
});

test('custom P: deleting removes it from favorites', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.tapFavorite('Access');
  await app.createCustom({ name: 'Late Night', message: 'Rest is allowed.', minutes: 2 });
  await app.tapFavorite('Late Night', 'mine');
  await app.askDelete('Late Night');
  await app.confirmDelete();
  assert.deepEqual(storedFavs(device), ['access']);
  assert.deepEqual(app.quickNames(), ['Access']);
});

test('custom Q: deleting clears its active timer', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Focus', message: 'Stay with this.', minutes: 30 });
  const id = storedCustoms(device)[0].id;
  await app.pressMine('Focus');
  await app.choose('30 minutes · Default');
  assert.equal(typeof stored(device)[id], 'number');
  await app.askDelete('Focus');
  await app.confirmDelete();
  assert.deepEqual(stored(device), {});
  await app.runFor(30 * MIN);
  assert.deepEqual(stored(device), {});
});

test('custom R: deleting one custom switch does not affect another', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'First', message: 'Keep going.', minutes: 5 });
  await app.createCustom({ name: 'Second', message: 'Still here.', minutes: 15 });
  await app.tapFavorite('Second', 'mine');
  await app.pressMine('Second');
  await app.choose('15 minutes · Default');
  const kept = storedCustoms(device)[1];
  const expiry = stored(device)[kept.id];
  await app.askDelete('First');
  await app.confirmDelete();
  assert.deepEqual(storedCustoms(device), [kept]);
  assert.deepEqual(app.mineNames(), ['Second']);
  assert.equal(app.isMineOff('Second'), true);
  assert.equal(stored(device)[kept.id], expiry);
  assert.deepEqual(storedFavs(device), [kept.id]);
  assert.deepEqual(app.quickNames(), ['Second']);
});

test('custom S: canceling deletion changes nothing', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.createCustom({ name: 'Late Night', message: 'Rest is allowed.', minutes: 2 });
  await app.tapFavorite('Late Night', 'mine');
  await app.pressMine('Late Night');
  await app.choose('2 minutes · Default');
  const before = [device.storage.get(CUSTOM_KEY), device.storage.get(FAV_KEY), device.storage.get(KEY)];
  await app.askDelete('Late Night');
  await app.cancelDelete();
  assert.equal(app.deleterOpen(), false);
  assert.equal(app.isMineOff('Late Night'), true);
  assert.deepEqual(app.mineNames(), ['Late Night']);
  assert.deepEqual(app.quickNames(), ['Late Night']);
  assert.deepEqual(
    [device.storage.get(CUSTOM_KEY), device.storage.get(FAV_KEY), device.storage.get(KEY)],
    before
  );
});

test('custom T: corrupt custom-switch storage does not break launch', async () => {
  const good = { id: 'custom-abc12345', name: 'Kept', message: 'Still here.', icon: '🌙', defaultDurationMinutes: 5 };
  const cases = [
    ['not json', []],
    [JSON.stringify({ name: 'Kept' }), []],
    [JSON.stringify([
      null,
      { id: 'overthinking', name: 'Nope', message: 'No.', icon: '🌙', defaultDurationMinutes: 2 },
      { id: 'custom-x', name: 'Too Short', message: 'No.', icon: '🌙', defaultDurationMinutes: 2 },
      { id: 'custom-missingmsg', name: 'No Message', icon: '🌙', defaultDurationMinutes: 2 },
      good,
      { ...good, id: 'custom-abc12345' },
    ]), ['Kept']],
  ];
  for (const [raw, expected] of cases) {
    const device = newDevice(new Map([
      [CUSTOM_KEY, raw],
      [KEY, JSON.stringify({ spiraling: T0 + MIN })],
      [FAV_KEY, JSON.stringify(['custom-abc12345', 'access'])],
    ]));
    const app = await launch(device);
    assert.deepEqual(app.mineNames(), expected, raw);
    assert.deepEqual(app.offNames(), ['Spiraling'], raw);
    assert.equal(app.rows.length, 12, raw);
    if (expected.length) {
      assert.deepEqual(app.quickNames(), ['Kept', 'Access'], raw);
      await app.pressMine('Kept');
      assert.equal(app.chooserLabels()[0], '5 minutes · Default', raw);
      await app.cancel();
    }
  }
});

const SHUTDOWN_KEY = 'toggle.shutdown.v1';
const storedShutdown = device => JSON.parse(device.storage.get(SHUTDOWN_KEY) ?? 'null');

test('shutdown A: first use starts at 20 minutes, Brown Noise, Immersive', async () => {
  const device = newDevice();
  const app = await launch(device);
  assert.equal(app.shutdownActive(), false);
  await app.startShutdown();
  const saved = storedShutdown(device);
  assert.equal(saved.session.durationMinutes, 20);
  assert.equal(saved.session.sound, 'brown-noise');
  assert.equal(saved.session.transition, 'immersive');
  assert.equal(app.els.shutdownRemaining.textContent, '20:00');
  assert.equal(app.els.shutdownSoundName.textContent, 'Brown Noise');
});

test('shutdown B and C: tapping Shutdown immediately saves now plus the selected duration', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  assert.equal(app.shutdownActive(), true);
  assert.equal(app.phone.hidden, true);
  assert.equal(storedShutdown(device).session.endsAt, T0 + 20 * MIN);
});

test('shutdown D: an active session restores after relaunch', async () => {
  const device = newDevice();
  await (await launch(device)).startShutdown();
  device.now = T0 + 5 * MIN;
  const relaunched = await launch(device);
  assert.equal(relaunched.shutdownActive(), true);
  assert.equal(relaunched.els.shutdownRemaining.textContent, '15:00');
  assert.equal(storedShutdown(device).session.endsAt, T0 + 20 * MIN);
});

test('shutdown E: an expired session clears on relaunch', async () => {
  const device = newDevice();
  await (await launch(device)).startShutdown();
  device.now = T0 + 20 * MIN;
  const relaunched = await launch(device);
  assert.equal(relaunched.shutdownActive(), false);
  assert.equal(relaunched.phone.hidden, false);
  assert.equal(storedShutdown(device).session, null);
  assert.deepEqual(relaunched.haptics, []);
});

test('shutdown F: resume reconciles the remaining time without a haptic', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  const entry = [...app.haptics];
  await app.suspendFor(5 * MIN);
  await app.resume();
  assert.equal(app.shutdownActive(), true);
  assert.equal(app.els.shutdownRemaining.textContent, '15:00');
  assert.equal(storedShutdown(device).session.endsAt, T0 + 20 * MIN);
  assert.deepEqual(app.haptics, entry);
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'still');
});

test('shutdown G and H: manual End Shutdown clears the session and returns to the main app', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.endShutdown();
  assert.equal(app.shutdownActive(), false);
  assert.equal(app.phone.hidden, false);
  assert.equal(storedShutdown(device).session, null);
  assert.equal(app.rows.length, 12);
});

test('shutdown I and J: automatic expiry returns to the main app with no haptic', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.runFor(2000);
  const afterEntry = [...app.haptics];
  await app.runFor(20 * MIN);
  assert.equal(app.shutdownActive(), false);
  assert.equal(storedShutdown(device).session, null);
  assert.deepEqual(app.haptics, afterEntry);
  assert.equal(app.audioLog.some(entry => entry[1] === 'threshold-exit'), false);
});

test('shutdown K: manual End Shutdown adds the light haptic', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  const before = app.haptics.length;
  await app.endShutdown();
  assert.equal(app.haptics[before], 'LIGHT');
  assert.equal(app.haptics.length, before + 1);
});

test('shutdown L: changing duration restarts the end time from now', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.runFor(MIN);
  await app.shutdownChoice('shutdownTime', 'shutdownTimeOptions', '10 minutes');
  assert.equal(storedShutdown(device).session.endsAt, T0 + MIN + 10 * MIN);
  assert.equal(storedShutdown(device).session.durationMinutes, 10);
  assert.equal(app.els.shutdownRemaining.textContent, '10:00');
});

test('shutdown M: changing sound updates the session', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Rain');
  assert.equal(storedShutdown(device).session.sound, 'rain');
  assert.equal(app.els.shutdownSoundName.textContent, 'Rain');
  assert.equal(storedShutdown(device).session.endsAt, T0 + 20 * MIN);
});

test('shutdown N: changing the transition updates the session', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.shutdownChoice('shutdownTransition', 'shutdownTransitionOptions', 'Gentle');
  assert.equal(storedShutdown(device).session.transition, 'gentle');
  assert.equal(storedShutdown(device).defaults.transition, 'gentle');
});

test('shutdown O: the next session uses the last duration, sound, and transition', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.shutdownChoice('shutdownTime', 'shutdownTimeOptions', '60 minutes');
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Ocean');
  await app.shutdownChoice('shutdownTransition', 'shutdownTransitionOptions', 'Minimal');
  await app.endShutdown();
  device.now += 1000;
  await app.startShutdown();
  const saved = storedShutdown(device);
  assert.equal(saved.session.durationMinutes, 60);
  assert.equal(saved.session.sound, 'ocean');
  assert.equal(saved.session.transition, 'minimal');
  assert.equal(saved.session.endsAt, device.now + 60 * MIN);
  assert.equal(saved.defaults.durationMinutes, 60);
});

test('shutdown P: corrupt Shutdown storage does not break launch', async () => {
  for (const raw of ['not json', JSON.stringify([]), JSON.stringify({ session: { endsAt: 'soon' } })]) {
    const device = newDevice(new Map([[SHUTDOWN_KEY, raw]]));
    const app = await launch(device);
    assert.equal(app.shutdownActive(), false, raw);
    assert.equal(app.rows.length, 12, raw);
    await app.startShutdown();
    assert.equal(storedShutdown(device).session.durationMinutes, 20, raw);
    assert.equal(storedShutdown(device).session.sound, 'brown-noise', raw);
    assert.equal(storedShutdown(device).session.transition, 'immersive', raw);
  }
});

const ambientCalls = app => app.audioLog.filter(entry => entry[0] !== 'configure');

test('audio A: Brown Noise starts when Shutdown begins', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.startShutdown();
  assert.deepEqual(app.looping(), ['brown-noise']);
  assert.equal(app.audioLog.filter(entry => entry[0] === 'loop').length, 1);
  assert.equal(app.audioLog.find(entry => entry[0] === 'preload')[2], 0.35);
});

test('audio B: Rain starts when selected', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Rain');
  assert.deepEqual(app.looping(), ['rain']);
});

test('audio C: Ocean starts when selected', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Ocean');
  assert.deepEqual(app.looping(), ['ocean']);
});

test('audio D: Quiet starts no audio', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Quiet');
  assert.deepEqual(app.looping(), []);
  assert.equal(ambientCalls(app).some(entry => entry[0] === 'loop' && entry[1] === 'quiet'), false);
});

test('audio E: changing sound stops the previous track before the new one', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Rain');
  const names = app.audioLog.map(entry => entry[0] + ':' + entry[1]);
  const stopAt = names.indexOf('stop:brown-noise');
  const rainAt = names.indexOf('loop:rain');
  assert.ok(stopAt >= 0 && rainAt > stopAt);
  assert.deepEqual(app.looping(), ['rain']);
});

test('audio F: changing to Quiet stops playback', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Quiet');
  assert.deepEqual(app.looping(), []);
  assert.ok(app.audioLog.some(entry => entry[0] === 'stop' && entry[1] === 'brown-noise'));
});

test('audio G: manual End Shutdown stops audio', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.endShutdown();
  assert.deepEqual(app.looping(), []);
});

test('audio H: automatic expiry stops audio', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.runFor(20 * MIN);
  assert.equal(app.shutdownActive(), false);
  assert.deepEqual(app.looping(), []);
});

test('audio I: an expired session on launch does not leave audio playing', async () => {
  const device = newDevice();
  await (await launch(device)).startShutdown();
  device.now = T0 + 20 * MIN;
  const relaunched = await launch(device);
  assert.equal(relaunched.shutdownActive(), false);
  assert.deepEqual(relaunched.looping(), []);
  assert.equal(relaunched.audioLog.some(entry => entry[0] === 'loop'), false);
});

test('audio J: restoring an active Shutdown plays the saved track', async () => {
  const device = newDevice();
  const app = await launch(device);
  await app.startShutdown();
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Ocean');
  const relaunched = await launch(device);
  assert.deepEqual(relaunched.looping(), ['ocean']);
});

test('audio K: repeated reconciliation does not stack playback', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.suspendFor(1000);
  await app.resume();
  await app.resume();
  assert.deepEqual(app.looping(), ['brown-noise']);
  assert.equal(app.audioLog.filter(entry => entry[0] === 'loop').length, 1);
});

test('audio L: a failed audio call does not corrupt the Shutdown session', async () => {
  const device = newDevice();
  const app = await launch(device, { audio: 'fail' });
  await app.startShutdown();
  assert.equal(app.shutdownActive(), true);
  assert.equal(storedShutdown(device).session.sound, 'brown-noise');
  assert.equal(storedShutdown(device).session.endsAt, T0 + 20 * MIN);
  assert.deepEqual(app.looping(), []);
});

test('audio M: the browser fallback plays in the foreground and does not throw', async () => {
  const app = await launch(newDevice(), { native: false });
  await app.startShutdown();
  assert.equal(app.shutdownActive(), true);
  assert.deepEqual(app.audioLog, [['browser-play', 'audio/brown-noise.wav', 0.35, true]]);
  await app.endShutdown();
  assert.equal(app.audioLog.at(-1)[0], 'browser-pause');
});

const HAPTICS_KEY = 'toggle.shutdown-haptics.v1';
const plays = (app, id) => app.audioLog.filter(entry => entry[0] === 'play' && entry[1] === id);

test('transition A and B: a new immersive entry starts the full path', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'threshold');
  assert.equal(app.els.shutdownView.getAttribute('data-motion'), 'immersive');
  assert.equal(app.phone.classList.contains('is-receding'), true);
  assert.equal(plays(app, 'threshold-enter').length, 1);
  assert.equal(plays(app, 'threshold-enter')[0][2], 0.22);
  assert.equal(plays(app, 'sweep-texture')[0][2], 0.2);
  assert.deepEqual(app.haptics, ['MEDIUM']);
  await app.runFor(12000);
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'still');
  assert.equal(app.els.shutdownEphemeral.classList.contains('show'), true);
  assert.deepEqual(app.looping(), ['brown-noise']);
  assert.deepEqual(app.haptics, ['MEDIUM', 'HEAVY', 'LIGHT']);
});

test('transition C: gentle uses the reduced path', async () => {
  const device = newDevice(new Map([[SHUTDOWN_KEY, JSON.stringify({ defaults: { durationMinutes: 20, sound: 'brown-noise', transition: 'gentle' }, session: null })]]));
  const app = await launch(device);
  await app.startShutdown();
  assert.equal(app.els.shutdownView.getAttribute('data-motion'), 'gentle');
  assert.equal(app.phone.classList.contains('is-receding-soft'), true);
  assert.equal(plays(app, 'threshold-enter')[0][2], 0.1);
  assert.equal(plays(app, 'sweep-texture')[0][2], 0.1);
  await app.runFor(1200);
  assert.deepEqual(app.haptics, ['MEDIUM', 'LIGHT']);
});

test('transition D: minimal skips the Spatial Sweep', async () => {
  const device = newDevice(new Map([[SHUTDOWN_KEY, JSON.stringify({ defaults: { durationMinutes: 20, sound: 'rain', transition: 'minimal' }, session: null })]]));
  const app = await launch(device);
  await app.startShutdown();
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'fade');
  assert.equal(app.els.shutdownView.getAttribute('data-motion'), 'minimal');
  assert.equal(plays(app, 'sweep-texture').length, 0);
  assert.equal(plays(app, 'threshold-enter').length, 0);
  assert.deepEqual(app.looping(), ['rain']);
  assert.deepEqual(app.haptics, ['LIGHT']);
});

test('transition E and F: restoring an active Shutdown does not replay entry', async () => {
  const device = newDevice();
  await (await launch(device)).startShutdown();
  const relaunched = await launch(device);
  assert.equal(relaunched.shutdownActive(), true);
  assert.equal(relaunched.els.shutdownView.getAttribute('data-phase'), 'still');
  assert.equal(plays(relaunched, 'threshold-enter').length, 0);
  assert.equal(plays(relaunched, 'sweep-texture').length, 0);
  assert.deepEqual(relaunched.haptics, []);
  assert.deepEqual(relaunched.looping(), ['brown-noise']);
});

test('transition G and H: Shutdown haptics Off suppresses entry and manual exit', async () => {
  const device = newDevice(new Map([[HAPTICS_KEY, 'false']]));
  const app = await launch(device);
  await app.startShutdown();
  await app.runFor(2000);
  await app.endShutdown();
  assert.deepEqual(app.haptics, []);
  await app.toggle('Overthinking');
  assert.deepEqual(app.haptics, ['MEDIUM']);
});

test('transition I: automatic expiry fires no Shutdown haptic and no exit wash', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.runFor(2000);
  const afterEntry = [...app.haptics];
  await app.runFor(20 * MIN);
  assert.deepEqual(app.haptics, afterEntry);
  assert.equal(app.audioLog.some(entry => entry[1] === 'threshold-exit'), false);
  assert.deepEqual(app.looping(), []);
});

test('transition J: Reduce Motion lowers visual intensity without weakening audio', async () => {
  const app = await launch(newDevice(), { reducedMotion: true });
  await app.startShutdown();
  assert.equal(app.els.shutdownView.getAttribute('data-motion'), 'reduced');
  assert.equal(app.phone.classList.contains('is-receding'), false);
  assert.equal(plays(app, 'sweep-texture').length, 1);
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'threshold');
});

test('transition K and L: handoff keeps the selected bed, including Quiet', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.runFor(12000);
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'still');
  assert.deepEqual(app.looping(), ['brown-noise']);
  await app.shutdownChoice('shutdownSound', 'shutdownSoundOptions', 'Quiet');
  assert.deepEqual(app.looping(), []);
  assert.equal(app.audioLog.some(entry => entry[0] === 'loop' && entry[1] === 'quiet'), false);
});

test('transition M: manual exit stops transition and ambient audio', async () => {
  const app = await launch(newDevice());
  await app.startShutdown();
  await app.endShutdown();
  assert.deepEqual(app.looping(), []);
  assert.ok(app.audioLog.some(entry => entry[0] === 'stop' && entry[1] === 'brown-noise'));
  assert.ok(app.audioLog.some(entry => entry[0] === 'stop' && entry[1] === 'threshold-enter'));
  assert.equal(plays(app, 'threshold-exit').length, 1);
});

test('transition N: a failed transition does not corrupt the Shutdown session', async () => {
  const device = newDevice();
  const app = await launch(device, { audio: 'fail' });
  await app.startShutdown();
  assert.equal(app.shutdownActive(), true);
  assert.equal(app.els.shutdownView.getAttribute('data-phase'), 'threshold');
  assert.equal(storedShutdown(device).session.sound, 'brown-noise');
  assert.equal(storedShutdown(device).session.endsAt, T0 + 20 * MIN);
  assert.equal(storedShutdown(device).session.transition, 'immersive');
});
