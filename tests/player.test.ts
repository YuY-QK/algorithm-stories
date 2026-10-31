import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import { usePlayer } from '../src/ui/vue/shared/usePlayer';
import { MANUAL, SPEEDS } from '../src/core/timing';

describe('usePlayer 手动档', () => {
  it('手动档点一下走一步，不自动播放', () => {
    const p = usePlayer(ref([1, 2, 3]), SPEEDS, SPEEDS.findIndex((s) => s.ms === MANUAL));
    expect(p.manual.value).toBe(true);
    p.toggle();
    expect(p.idx.value).toBe(1);
    expect(p.playing.value).toBe(false);
    p.toggle();
    expect(p.idx.value).toBe(2);
    p.toggle(); // 到头了再点：回到开头，不自动播放
    expect(p.idx.value).toBe(0);
    expect(p.playing.value).toBe(false);
  });

  it('默认档是自动播放的「中」', () => {
    const p = usePlayer(ref([1, 2, 3]));
    expect(p.manual.value).toBe(false);
    expect(p.speed.value).toBe(1500);
    p.stop();
  });
});
