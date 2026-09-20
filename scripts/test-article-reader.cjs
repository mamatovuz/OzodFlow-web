// Deterministic playback regression tests; no TTS credentials or speakers required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(saved = false) {
  let cursor = 0;
  let now = 0;
  let timer;
  let utterance;
  let speaks = 0;
  const hooks = [];
  const react = {
    memo: (x) => x,
    useState(value) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = value;
      return [hooks[i], (v) => { hooks[i] = typeof v === 'function' ? v(hooks[i]) : v; }];
    },
    useRef(value) {
      const i = cursor++;
      return hooks[i] ||= { current: value };
    },
    useCallback: (x) => x,
    useMemo: (f) => f(),
    useEffect() {},
  };
  const blocks = ['First paragraph has several words. '.repeat(8), 'Second paragraph is shorter.'].map((text) => {
    const classes = new Set();
    const styles = new Map();
    const el = {
      classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) },
      style: { setProperty: (k, v) => styles.set(k, v), removeProperty: (k) => styles.delete(k) },
      getBoundingClientRect: () => ({ top: 150, bottom: 250 }),
      closest: (selector) => selector.startsWith('button') ? null : el,
      classes, styles,
    };
    return { data: text, parentElement: el };
  });
  const audio = {
    currentTime: 0, duration: 100, paused: true, src: '',
    async play() { this.paused = false; },
    pause() { this.paused = true; },
    removeAttribute() { this.src = ''; }, load() {},
  };
  const context = {
    exports: {}, TextEncoder, URL, console,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
      return {};
    },
    performance: { now: () => now },
    setInterval: (f) => { timer = f; return 1; },
    clearInterval: () => { timer = null; },
    NodeFilter: { SHOW_TEXT: 4 },
    document: {
      createTreeWalker() {
        let i = -1;
        return { nextNode: () => ++i < blocks.length, get currentNode() { return blocks[i]; } };
      },
      createRange: () => ({ setStart() {}, setEnd() {} }),
    },
    window: {
      innerHeight: 800, CSS: { highlights: new Map() },
      Highlight: class { clear() {} add() {} },
      speechSynthesis: {
        getVoices: () => [], cancel() {}, pause() {}, resume() {},
        speak(u) { utterance = u; speaks++; u.onstart(); },
      },
    },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    fetch: async () => ({ ok: false }),
  };
  const source = fs.readFileSync('src/components/site/article-reader.tsx', 'utf8').replace(
    '  const selectedVoice =',
    `  Object.assign(globalThis, { reader: { toggleListen, stopAudio, onSavedTime, audioState, progress, contentRef, audioRef, buildBlocks, playLiveFrom, chunksRef, abortRef } });
  const selectedVoice =`,
  );
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText, context);
  function render() {
    cursor = 0;
    context.exports.ArticleReader({ html: '', toc: [], translations: {}, slug: 'test', ttsOn: true,
      audioUrl: saved ? '/test.mp3' : null, labels: {} });
    context.reader.contentRef.current = { querySelector: () => ({}) };
    context.reader.audioRef.current = audio;
    return context.reader;
  }
  render();
  return { render, audio, blocks, context,
    tick(ms) { now += ms; timer?.(); },
    get speaks() { return speaks; },
    get utterance() { return utterance; },
  };
}

(async () => {
  const browser = setup();
  await browser.render().toggleListen();
  assert.equal(browser.render().audioState, 'playing');
  browser.tick(2000);
  const before = browser.render().progress;
  assert.ok(before > 0);
  await browser.render().toggleListen();
  browser.tick(20000);
  assert.equal(browser.render().progress, before, 'Paused time must not advance highlighting');
  assert.equal(browser.render().audioState, 'paused');
  await browser.render().toggleListen();
  browser.tick(1000);
  assert.ok(browser.render().progress > before, 'Highlight timer must resume');
  assert.equal(browser.speaks, 1, 'Resume must not create another utterance');
  const oldUtterance = browser.utterance;
  browser.render().stopAudio();
  oldUtterance.onend();
  assert.equal(browser.render().audioState, 'idle', 'Old events must not restart playback');
  assert.ok(browser.blocks.every((b) => !b.parentElement.classes.has('tts-reading')));

  const saved = setup(true);
  await saved.render().toggleListen();
  saved.audio.currentTime = 42;
  saved.render().onSavedTime();
  await saved.render().toggleListen();
  assert.equal(saved.render().progress, 42);
  await saved.render().toggleListen();
  assert.equal(saved.audio.currentTime, 42, 'Saved audio must resume at its paused position');
  saved.audio.pause();
  saved.audio.play = async () => { throw Error('blocked'); };
  await saved.render().toggleListen();
  await saved.render().toggleListen();
  assert.equal(saved.render().audioState, 'paused', 'Failed resume must remain retryable');

  const stale = setup();
  let resolveFetch;
  stale.context.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });
  const pending = stale.render().toggleListen();
  stale.render().stopAudio();
  resolveFetch({ ok: true, blob: async () => ({}) });
  await pending;
  assert.equal(stale.audio.src, '', 'Old TTS responses must not replace the audio source');
  assert.equal(stale.render().audioState, 'idle');
  console.log('Article reader: pause/resume, highlighting, errors and stale-session checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
