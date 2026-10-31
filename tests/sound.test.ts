import { afterEach, describe, expect, it } from 'vitest';
import { muted, play, setBackend, setMuted, synthBackend, type SoundName } from '../src/ui/vue/shared/sound';

describe('sound', () => {
  afterEach(() => {
    setBackend(synthBackend);
    setMuted(false);
  });

  it('静音时不调用后端，取消静音后调用', () => {
    const played: SoundName[] = [];
    setBackend({ play: (n) => played.push(n) });
    setMuted(true);
    play('right');
    expect(muted.value).toBe(true);
    expect(played).toEqual([]);
    setMuted(false);
    play('right');
    expect(played).toEqual(['right']);
  });

  it('后端出错不会抛到调用方', () => {
    setBackend({ play: () => { throw new Error('boom'); } });
    expect(() => play('wrong')).not.toThrow();
  });

  it('没有浏览器环境时默认后端什么也不做', () => {
    expect(() => play('win')).not.toThrow();
  });
});
