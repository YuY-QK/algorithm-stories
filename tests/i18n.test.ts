import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { format, placeholders, toHtml, translate } from '../src/i18n/format';
import { LOCALE, LOCALES, loadDict } from '../src/i18n/load';

// 语言文件的规矩：zh 是基准；其他语言的文件、键、占位符都要和 zh 一模一样（漏翻、多翻都算错）
const base = LOCALES[LOCALE];
const slugs = readdirSync('content/algorithms');

describe('语言文件', () => {
  it('每个文件都是一层扁平的「键 → 字符串」', () => {
    for (const [locale, files] of Object.entries(LOCALES)) {
      for (const [name, dict] of Object.entries(files)) {
        for (const [k, v] of Object.entries(dict)) {
          expect(typeof v, locale + '/' + name + '.json 的 ' + k).toBe('string');
        }
      }
    }
  });

  it('每一关都有自己的文件和 meta 文案', () => {
    for (const slug of slugs) {
      const dict = base[slug];
      expect(dict, LOCALE + '/' + slug + '.json').toBeDefined();
      for (const k of ['meta.title', 'meta.storyTitle', 'meta.lede', 'meta.summary']) expect(dict[k], slug + ' ' + k).toBeTruthy();
    }
  });

  it('关卡文件不和 common.json 重名（重名时关卡会悄悄盖掉通用的）', () => {
    for (const [name, dict] of Object.entries(base)) {
      if (name === 'common') continue;
      const dup = Object.keys(dict).filter((k) => k in base.common);
      expect(dup, name).toEqual([]);
    }
  });

  it('其他语言和 zh 的文件、键、占位符一致', () => {
    for (const [locale, files] of Object.entries(LOCALES)) {
      if (locale === LOCALE) continue;
      expect(Object.keys(files).sort(), locale).toEqual(Object.keys(base).sort());
      for (const [name, dict] of Object.entries(base)) {
        const other = files[name];
        expect(Object.keys(other).sort(), locale + '/' + name).toEqual(Object.keys(dict).sort());
        for (const [k, v] of Object.entries(dict)) {
          expect(placeholders(other[k]), locale + '/' + name + ' ' + k).toEqual(placeholders(v));
        }
      }
    }
  });
});

describe('翻译函数', () => {
  const dict = { a: '找到啦 🎉 只看了 {n} 次！', dir: '信在{side}', left: '左边' };

  it('填参数，参数也可以是另一句', () => {
    expect(translate(dict, 'a', { n: 4 })).toBe('找到啦 🎉 只看了 4 次！');
    expect(translate(dict, { key: 'dir', params: { side: { key: 'left' } } })).toBe('信在左边');
  });

  it('缺键、缺参数时看得出来', () => {
    expect(translate(dict, 'nope')).toBe('⟦nope⟧');
    expect(format('{x} 和 {y}', { x: 1 })).toBe('1 和 {y}');
  });

  it('简单格式转 HTML，并且先转义', () => {
    expect(toHtml('用 `a < b`，**注意**，见 [这里](https://x.y/z)')).toBe('用 <code>a &lt; b</code>，<b>注意</b>，见 <a href="https://x.y/z">这里</a>');
  });

  it('页面字典 = 通用 + 本关', () => {
    const d = loadDict('binary-search');
    expect(d['site.name']).toBe(base.common['site.name']);
    expect(d['meta.title']).toBe(base['binary-search']['meta.title']);
  });
});
