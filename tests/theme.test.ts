import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import tokens from '../src/theme/tokens.json';
import * as timing from '../src/core/timing';
import * as oldTiming from '../src/components/shared/timing';

const { generate, outFile } = createRequire(import.meta.url)('../scripts/gen-theme.cjs');

describe('主题变量', () => {
  it('src/styles/tokens.css 和 tokens.json 一致（改了 tokens.json 要运行 npm run gen:theme）', () => {
    expect(readFileSync(outFile, 'utf8')).toBe(generate(tokens));
  });

  it('深色只覆盖浅色里已有的变量', () => {
    for (const k of Object.keys(tokens.dark)) expect(Object.keys(tokens.light)).toContain(k);
  });

  it('theme.css 不再自己定义这些变量', () => {
    const css = readFileSync(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
    expect(css).toContain('@import "./tokens.css"');
    expect(css).not.toMatch(/^\s*--(bg|accent|fg|line):/m);
  });
});

describe('timing', () => {
  it('常量来自 tokens.json，旧路径转出同一份', () => {
    expect(timing.SPEEDS).toEqual(tokens.motion.speeds);
    expect(timing.SPEEDS.find((s) => s.ms === timing.MANUAL)).toBeTruthy();
    expect(timing.PAUSE_LONG).toBe(tokens.motion.PAUSE_LONG);
    expect(oldTiming.SPEEDS).toBe(timing.SPEEDS);
    expect(oldTiming.SHAKE_MS).toBe(timing.SHAKE_MS);
  });
});
