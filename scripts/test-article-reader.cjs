// Deterministic playback regression tests; no TTS credentials or speakers required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const timingModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/tts-timing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, timingModule);

async function testProviderMetadata() {
  const { EventEmitter } = require('node:events');
  class Socket extends EventEmitter {
    constructor() { super(); queueMicrotask(() => this.emit('open')); }
    send(message) {
      if (message.includes('Path:speech.config')) {
        assert.ok(message.includes('"wordBoundaryEnabled":"true"'));
        return;
      }
      queueMicrotask(() => {
        this.emit('message', Buffer.from('Path:audio.metadata\r\n\r\n' + JSON.stringify({ Metadata: [
          { Type: 'WordBoundary', Data: { Offset: 5000000, Duration: 4000000, text: { Text: 'Salom' } } },
          { Type: 'WordBoundary', Data: { Offset: 30000000, Duration: 6000000, text: { Text: 'dunyo' } } },
        ] })), false);
        const header = Buffer.from('Path:audio\r\n');
        const length = Buffer.alloc(2);
        length.writeUInt16BE(header.length);
        this.emit('message', Buffer.concat([length, header, Buffer.from('audio-data')]), true);
        this.emit('message', Buffer.from('Path:turn.end\r\n\r\n'), false);
      });
    }
    close() { this.emit('close'); }
  }
  const context = { exports: {}, Buffer, setTimeout, clearTimeout,
    require: (name) => ({ default: name === 'ws' ? Socket : require(name) }),
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/edge-tts.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  const result = await context.exports.edgeSynthesizeTimed('Salom dunyo', { id: 'test', lang: 'uz-UZ' });
  assert.equal(result.audio.toString(), 'audio-data');
  assert.equal(result.timings.length, 2, 'All metadata entries must be retained');
  assert.equal(result.timings[0].time, 0.5, 'Provider ticks must be converted to seconds');
  assert.equal(result.timings[1].time, 3);
}

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
    exports: {}, TextEncoder, URL, Blob, atob, console,
    require(name) {
      if (name === 'react') return react;
      if (name === '@/lib/tts-timing') return timingModule.exports;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
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
      createRange: () => ({ setStart(node, start) { this.start = start; }, setEnd() {} }),
    },
    window: {
      innerHeight: 800, CSS: { highlights: new Map() },
      Highlight: class { clear() { this.range = null; } add(range) { this.range = range; } },
      speechSynthesis: {
        getVoices: () => [], cancel() {}, pause() {}, resume() {},
        speak(u) { utterance = u; speaks++; u.onstart?.(); },
      },
    },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    fetch: async () => saved ? ({ ok: true, json: async () => ({ timings: [
      { time: 0.5, duration: 1, text: 'First' },
      { time: 40, duration: 1, text: 'paragraph' },
    ] }) }) : ({ ok: false }),
  };
  const source = fs.readFileSync('src/components/site/article-reader.tsx', 'utf8').replace(
    '  return (',
    `  Object.assign(globalThis, { reader: { toggleListen, stopAudio, onSavedTime, audioState, progress, contentRef, audioRef } });
  return (`,

  );
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText, context);
  function render() {
    cursor = 0;
    context.tree = context.exports.ArticleReader({ html: '', toc: [], translations: {}, slug: 'test', ttsOn: true,
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
  await testProviderMetadata();
  const absent = setup();
  let fetches = 0;
  absent.context.fetch = async () => { fetches++; throw Error('must not fetch'); };
  await absent.render().toggleListen();
  assert.equal(absent.render().audioState, 'idle');
  assert.equal(absent.audio.src, '');
  assert.equal(fetches, 0, 'Missing recordings must never trigger synthesis or metadata requests');
  assert.equal(absent.speaks, 0, 'Missing recordings must never invoke browser speech');
  assert.ok(JSON.stringify(absent.context.tree).includes('Hali ovoz'));

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

  const stale = setup(true);
  let resolveFetch;
  stale.context.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });
  const pending = stale.render().toggleListen();
  stale.render().stopAudio();
  resolveFetch({ ok: true, json: async () => ({ audio: '', timings: [] }) });
  await pending;
  assert.equal(stale.audio.src, '', 'Old TTS responses must not replace the audio source');
  assert.equal(stale.render().audioState, 'idle');

  const timed = setup(true);
  await timed.render().toggleListen();
  timed.audio.currentTime = 30;
  timed.tick(30000);
  const highlighted = timed.context.window.CSS.highlights.get('article-tts-word');
  assert.equal(highlighted.range.start, 0, 'Long pause must not advance to the next word');
  timed.audio.currentTime = 40;
  timed.tick(50);
  assert.equal(highlighted.range.start, 6, 'Word must advance at the actual audio timestamp');
  await timed.render().toggleListen();
  timed.audio.currentTime = 0;
  timed.tick(5000);
  assert.equal(highlighted.range.start, 6, 'Paused playback must keep its highlighted word');
  timed.render().stopAudio();

  const legacy = setup(true);
  legacy.context.fetch = async () => ({ ok: false });
  await legacy.render().toggleListen();
  assert.equal(legacy.audio.src, '/test.mp3', 'Legacy audio still plays without regeneration');
  legacy.audio.currentTime = 75;
  legacy.tick(5000);
  assert.equal(legacy.context.window.CSS.highlights.get('article-tts-word').range, null,
    'Missing timings must not fabricate word positions');
  assert.equal(legacy.speaks, 0);
  legacy.render().stopAudio();

  const { mapWordTimings, cueAtTime } = timingModule.exports;
  const cues = mapWordTimings("Salom, dunyo! Salom yana.", [
    { time: 0.5, duration: 0.4, text: 'Salom' },
    { time: 3.0, duration: 0.8, text: 'dunyo' },
    { time: 9.0, duration: 0.4, text: 'Salom' },
  ]);
  assert.equal(cueAtTime(cues, 0.2), undefined, 'Initial silence must not highlight a word');
  assert.equal(cueAtTime(cues, 2.9).charIndex, 0, 'Long pause must not jump to the next word');
  assert.equal(cueAtTime(cues, 3).charIndex, 7);
  assert.equal(cueAtTime(cues, 8.9).charIndex, 7);
  assert.equal(cueAtTime(cues, 9).charIndex, 14, 'Repeated words must map in order');
  assert.equal(cueAtTime(cues, 1).charIndex, 0, 'Seeking backwards must restore the actual word');
  console.log('Article reader: pause/resume, highlighting, errors and stale-session checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
