import { ref } from 'vue';

/**
 * 共享音效层。各组件只调用 play(名字)，不关心声音怎么来的。
 * 以后要换成第三方人声库，写一个新的 SoundBackend，用 setBackend 换掉就行，调用方不用改。
 */
export type SoundName = 'tap' | 'tick' | 'page' | 'right' | 'wrong' | 'win';

export interface SoundBackend {
  play(name: SoundName): void;
}

const KEY = 'algo:muted';

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** 是否静音，所有关卡共用，记在浏览器里 */
export const muted = ref(typeof localStorage === 'undefined' ? false : readMuted());

export function setMuted(v: boolean) {
  muted.value = v;
  try {
    localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* 隐私模式等读写失败时，只在本次页面里生效 */
  }
}

/** [起始频率 Hz, 持续毫秒, 波形, 音量] 的音符序列，按顺序一个接一个 */
type Note = [freq: number, ms: number, wave?: OscillatorType, gain?: number];

const PATCHES: Record<SoundName, Note[]> = {
  tap: [[520, 70, 'triangle', 0.12]],
  tick: [[330, 40, 'sine', 0.05]],
  page: [[400, 60, 'triangle', 0.08], [560, 80, 'triangle', 0.08]],
  right: [[523, 90, 'sine', 0.15], [784, 160, 'sine', 0.15]],
  wrong: [[220, 140, 'sawtooth', 0.08], [175, 200, 'sawtooth', 0.08]],
  win: [[523, 110, 'sine', 0.15], [659, 110, 'sine', 0.15], [784, 110, 'sine', 0.15], [1047, 280, 'sine', 0.15]],
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  // 浏览器要求先有点击才能出声；这里都是在点击后调用的
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 默认的合成音效：用浏览器自带的 Web Audio 现场合成，不带任何音频文件 */
export const synthBackend: SoundBackend = {
  play(name) {
    const c = context();
    if (!c) return;
    let t = c.currentTime;
    for (const [freq, ms, wave = 'sine', gain = 0.1] of PATCHES[name]) {
      const osc = c.createOscillator();
      const amp = c.createGain();
      osc.type = wave;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(amp).connect(c.destination);
      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
      t += ms / 1000;
    }
  },
};

let backend: SoundBackend = synthBackend;

export function setBackend(b: SoundBackend) {
  backend = b;
}

export function play(name: SoundName) {
  if (muted.value) return;
  try {
    backend.play(name);
  } catch {
    /* 声音出问题不能影响玩 */
  }
}
