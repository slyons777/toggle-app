import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../www/index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];

class FakeElement {
  constructor() {
    this.cls = new Set();
    this.attrs = {};
    this.children = [];
    this.hidden = false;
    this.textContent = '';
    this.value = '';
    this.dataset = {};
    this.classList = {
      add: (...c) => c.forEach(x => this.cls.add(x)),
      remove: (...c) => c.forEach(x => this.cls.delete(x)),
      contains: c => this.cls.has(c),
    };
  }
  set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.cls].join(' '); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  append(...nodes) { nodes.forEach(node => { node.parent = this; this.children.push(node); }); }
  replaceChildren(...nodes) {
    this.children.forEach(child => { child.parent = null; });
    this.children = [];
    nodes.forEach(node => this.append(node));
  }
  querySelector(sel) {
    const all = [this, ...this.children.flatMap(function walk(node) {
      return [node, ...(node.children || []).flatMap(walk)];
    })];
    if (sel === '.toggle') return all.find(node => node.cls && node.cls.has('toggle')) || null;
    if (sel === '.row') return all.find(node => node.cls && node.cls.has('row')) || null;
    return null;
  }
}

const tick = () => new Promise(resolve => setImmediate(resolve));

async function launch(storage = new Map()) {
  const ids = [
    'home', 'shutdownEntry', 'filterRow', 'pinnedSection', 'pinned', 'mindSection', 'mind', 'boundsSection', 'bounds', 'openHeld',
    'wordsMe', 'wordsMeBack', 'wordsMeLine', 'wordsMeAnother', 'wordsThem', 'wordsThemBack', 'scriptTabs', 'scriptLine',
    'scriptCopy', 'scriptAnother', 'scriptCopied', 'held', 'heldBack', 'heldField', 'heldSave', 'heldList',
    'shutdownView', 'shutdownLine', 'shutdownSounds', 'shutdownContinue', 'shutdownLeave',
  ];
  const els = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
  const haptics = [];
  const context = {
    window: { Capacitor: { Plugins: {
      Preferences: {
        get: async ({ key }) => ({ value: storage.has(key) ? storage.get(key) : null }),
        set: async ({ key, value }) => { storage.set(key, value); },
      },
      Haptics: { impact: async ({ style }) => { haptics.push(style); } },
      NativeAudio: {
        configure: async () => {},
        preload: async () => {},
        loop: async () => {},
        stop: async () => {},
        unload: async () => {},
      },
    } } },
    document: {
      getElementById: id => els[id],
      createElement: () => new FakeElement(),
    },
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout: (fn) => { fn(); return 1; },
    navigator: {},
    Promise,
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  await tick();
  const row = name => els.mind.children.concat(els.bounds.children).find(wrap => wrap.children[0].children[0].children[1].textContent === name);
  const isOff = name => row(name).querySelector('.toggle').classList.contains('off');
  const turnOff = async name => { row(name).querySelector('.toggle').onclick(); await tick(); };
  const lineOf = name => row(name).children[1].children[0].textContent;
  const tapAction = async (name, label) => {
    row(name).children[1].children[2].children.find(node => node.textContent === label).onclick();
    await tick();
  };
  return { els, haptics, storage, row, isOff, turnOff, lineOf, tapAction };
}

test('turning Overthinking off shows a canonical line and records no time', async () => {
  const app = await launch();
  const wrap = app.row('Overthinking');
  const button = wrap.querySelector('.toggle');
  button.onclick();
  await tick();
  assert.equal(button.classList.contains('off'), true);
  assert.equal(wrap.children[1].hidden, false);
  const line = wrap.children[1].children[0].textContent;
  assert.match(line, /Adjourned|solve this right now|done already|stay unanswered/);
  assert.equal(line.includes('"'), false);
  assert.equal(app.storage.has('toggle.expirations.v1'), false);
  assert.equal(app.storage.has('toggle.paused.v1'), false);
  assert.deepEqual(app.haptics, ['MEDIUM']);
});

test('a switch only moves from on to off', async () => {
  const app = await launch();
  await app.turnOff('Overthinking');
  const line = app.row('Overthinking').children[1].children[0].textContent;
  await app.turnOff('Overthinking');
  assert.equal(app.isOff('Overthinking'), true);
  assert.equal(app.row('Overthinking').children[1].children[0].textContent, line);
  assert.deepEqual(app.haptics, ['MEDIUM']);
});

test('dismissing the response returns the switch to rest', async () => {
  const app = await launch();
  await app.turnOff('Overthinking');
  await app.tapAction('Overthinking', "That's enough");
  const button = app.row('Overthinking').querySelector('.toggle');
  assert.equal(app.isOff('Overthinking'), false);
  assert.equal(app.row('Overthinking').children[1].hidden, true);
  assert.equal(button.getAttribute('aria-disabled'), undefined);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
});

test('a rested switch can be turned off again for a fresh line', async () => {
  const app = await launch();
  await app.turnOff('Overthinking');
  const first = app.lineOf('Overthinking');
  await app.tapAction('Overthinking', "That's enough");
  await app.turnOff('Overthinking');
  const second = app.lineOf('Overthinking');
  assert.equal(app.isOff('Overthinking'), true);
  assert.equal(app.row('Overthinking').children[1].hidden, false);
  assert.ok(second.length > 0);
  assert.notEqual(second, first);
  assert.deepEqual(app.haptics, ['MEDIUM', 'LIGHT', 'MEDIUM']);
});

test('opening a follow-up returns the switch to rest', async () => {
  const app = await launch();
  await app.turnOff('Overthinking');
  await app.tapAction('Overthinking', 'Words for me');
  assert.equal(app.els.wordsMe.hidden, false);
  assert.equal(app.isOff('Overthinking'), false);
  assert.equal(app.row('Overthinking').children[1].hidden, true);
});

test('paused switches are not saved across a relaunch', async () => {
  const storage = new Map();
  const first = await launch(storage);
  await first.turnOff('Spiraling');
  const second = await launch(storage);
  assert.equal(second.isOff('Spiraling'), false);
});

test('That is enough closes the follow-up', async () => {
  const app = await launch();
  const wrap = app.row('Overthinking');
  wrap.querySelector('.toggle').onclick();
  await tick();
  const enough = wrap.children[1].children[2].children.find(node => node.textContent === "That's enough");
  enough.onclick();
  await tick();
  assert.equal(wrap.children[1].hidden, true);
  assert.deepEqual(app.haptics, ['MEDIUM', 'LIGHT']);
});

test('Shutdown has no remaining-time readout', async () => {
  const app = await launch();
  app.els.shutdownEntry.onclick();
  assert.equal(app.els.shutdownView.hidden, false);
  assert.equal(app.els.shutdownRemaining, undefined);
  assert.equal(html.includes('role="timer"'), false);
});
