import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevel, type LevelContext } from '../src/core/level';
import { renderMiniMd } from '../src/ui/mini-md';

const rules = {
  look: { story: {} as never },
  games: { hide: {} as never },
  trace: { main: {} as never },
};
const ctx: LevelContext = {
  slug: 'demo', rules, scenes: ['A', 'B'],
  copy: { 'story.title': '故事', 'hide.title': '藏', 'trace.title': '看', 'write.title': '写', 'write.body': '正文' },
};
const ok = {
  look: [{ id: 'story', kind: 'book', icon: '📖', rules: 'story', scene: 'A' }],
  play: [{ id: 'hide', kind: 'game', icon: '🍃', rules: 'hide', scene: 'A', after: 'B', frame: 'stage' }],
  do: [
    { id: 'trace', kind: 'trace', icon: '①', rules: 'main', scene: 'B' },
    { id: 'write', kind: 'exercise', icon: '④', file: 'X.kt', package: 'x' },
  ],
  more: [{ kind: 'markdown', src: 'more' }],
};
const bad = (patch: (l: typeof ok) => unknown) => () => parseLevel(patch(structuredClone(ok)), ctx);

describe('level.json 校验', () => {
  it('写对的通过', () => {
    expect(Object.keys(parseLevel(ok, ctx))).toEqual(['look', 'play', 'do', 'more']);
  });

  it('写错了报出是哪一块哪一项', () => {
    expect(bad((l) => ({ ...l, extra: [] }))).toThrow(/extra.*不是四步之一/);
    expect(bad((l) => { l.play[0].rules = 'nope'; return l; })).toThrow(/play\[0\].*rules "nope".*有：hide/);
    expect(bad((l) => { l.do[0].scene = 'Z'; return l; })).toThrow(/do\[0\].*scene "Z".*A、B/);
    expect(bad((l) => { l.play[0].after = 'Z'; return l; })).toThrow(/after "Z"/);
    expect(bad((l) => { (l.do[0] as { kind: string }).kind = 'game'; l.do[0].rules = 'main'; return l; })).toThrow(/rules "main"/);
    expect(bad((l) => { (l.play[0] as { kind: string }).kind = 'trace'; return l; })).toThrow(/不能放在「play」/);
    expect(bad((l) => { l.do[0].id = 'story'; return l; })).toThrow(/id "story" 重复|缺少 story.title|rules/);
    expect(bad((l) => { delete (l.do[1] as { file?: string }).file; return l; })).toThrow(/缺少字符串字段 file/);
    expect(bad((l) => { l.look[0].id = 'nobody'; return l; })).toThrow(/缺少 nobody.title/);
    expect(bad((l) => { (l.play[0] as { frame: string }).frame = 'x'; return l; })).toThrow(/frame/);
    expect(() => parseLevel([], ctx)).toThrow(/对象/);
    expect(() => parseLevel({}, ctx)).toThrow(/一步都没有/);
  });

  it('content 里每个 level.json 都能通过格式校验（rules 和 scene 的对应由页面构建时检查）', () => {
    const dir = new URL('../content/algorithms/', import.meta.url);
    const slugs = readdirSync(dir).filter((s) => readdirSync(new URL(s + '/', dir)).includes('level.json'));
    expect(slugs).toContain('binary-search');
    for (const slug of slugs) {
      const json = JSON.parse(readFileSync(new URL(slug + '/level.json', dir), 'utf8'));
      const copy = JSON.parse(readFileSync(new URL(slug + '/copy.zh.json', dir), 'utf8'));
      // 宽松上下文：把用到的名字都当作存在，只检查结构和文案标题
      const blocks = Object.values(json).flat() as { rules?: string; scene?: string; after?: string }[];
      const all = Object.fromEntries(blocks.filter((b) => b.rules).map((b) => [b.rules!, {} as never]));
      const scenes = blocks.flatMap((b) => [b.scene, b.after]).filter(Boolean) as string[];
      expect(() => parseLevel(json, { slug, rules: { look: all, games: all, trace: all, predict: all, bugs: all }, scenes, copy })).not.toThrow();
    }
  });
});

describe('mini-md', () => {
  it('段落、列表、行内代码和链接；先转义再标记', () => {
    const html = renderMiniMd('打开 [`exercises/`](http://x/y) 换成 `TODO()`：\n\n- `a<b>`：一\n- 二 & 三\n\n结尾');
    expect(html).toBe(
      '<p>打开 <a href="http://x/y"><code>exercises/</code></a> 换成 <code>TODO()</code>：</p>\n'
      + '<ul><li><code>a&lt;b&gt;</code>：一</li><li>二 &amp; 三</li></ul>\n'
      + '<p>结尾</p>',
    );
  });
});
