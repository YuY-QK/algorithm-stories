/**
 * level.json 的格式（阶段 R，见 docs/refactor-plan.md 7.2）：一关的四步各有哪些块。
 * 构建时用 parseLevel 校验，写错直接报错，并指出是哪一块哪一项。
 */
import type { Copy, LevelModule } from './types';

export type Stage = 'look' | 'play' | 'do' | 'more';
export const LEVEL_STAGES: readonly Stage[] = ['look', 'play', 'do', 'more'];

interface Base {
  id: string;
  icon: string;
}
export interface BookBlock extends Base { kind: 'book'; rules: string; scene: string }
export interface GameBlock extends Base {
  kind: 'game';
  rules: string;
  scene: string;
  /** 画在按钮和提示之后的第二块画面 */
  after?: string;
  /** game：浅色凹槽，目标提示是小贴士（默认）；stage：普通的操作区 */
  frame?: 'game' | 'stage';
  /** 台词预留几行高度（默认 1）；台词常折成两行的关写 2，免得页面跳动 */
  sayLines?: 1 | 2;
  /** 台词字号：small 小一号（画面大、字多的关，如 BFS、DFS） */
  saySize?: 'small';
}
export interface TraceBlock extends Base {
  kind: 'trace';
  rules: string;
  scene: string;
  /** 画在变量标签之后的第二块画面（如快速排序的调用栈） */
  after?: string;
}
export interface PredictBlock extends Base { kind: 'predict'; rules: string; scene: string }
export interface BugsBlock extends Base { kind: 'bugs'; rules: string; scene: string }
export interface ExerciseBlock extends Base {
  kind: 'exercise';
  /** 练习文件名，如 BinarySearch.kt */
  file: string;
  /** Kotlin 包名，终端命令由它生成 */
  package: string;
}
/** 延伸阅读：把 content/algorithms/<slug>/<src>.zh.md 按「## 」切成若干块 */
export interface MarkdownBlock { kind: 'markdown'; src: string }

export type Block = BookBlock | GameBlock | TraceBlock | PredictBlock | BugsBlock | ExerciseBlock | MarkdownBlock;
export type Level = Partial<Record<Stage, Block[]>>;

/** 每一步里允许的块类型 */
const ALLOWED: Record<Stage, Block['kind'][]> = {
  look: ['book'],
  play: ['game'],
  do: ['trace', 'predict', 'bugs', 'exercise', 'game'],
  more: ['markdown'],
};

/** 块的 rules 指向 LevelModule 的哪个分组 */
const GROUP: Partial<Record<Block['kind'], keyof LevelModule>> = {
  book: 'look', game: 'games', trace: 'trace', predict: 'predict', bugs: 'bugs',
};

export interface LevelContext {
  slug: string;
  /** 引擎导出的规则 */
  rules: LevelModule;
  /** 画面注册表里有哪些名字 */
  scenes: string[];
  /** 本关的文案表（不含共用部分） */
  copy: Copy;
}

export function parseLevel(raw: unknown, ctx: LevelContext): Level {
  const fail = (where: string, msg: string): never => {
    throw new Error('content/algorithms/' + ctx.slug + '/level.json ' + where + '：' + msg);
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('', '最外层必须是对象');
  const out: Level = {};
  const ids = new Set<string>();

  for (const [stage, blocks] of Object.entries(raw)) {
    if (!(LEVEL_STAGES as readonly string[]).includes(stage)) fail(stage, '不是四步之一（' + LEVEL_STAGES.join('、') + '）');
    if (!Array.isArray(blocks) || blocks.length === 0) fail(stage, '必须是非空数组');
    (blocks as Record<string, unknown>[]).forEach((b, k) => {
      const where = stage + '[' + k + ']';
      const kind = b?.kind as Block['kind'];
      if (!ALLOWED[stage as Stage].includes(kind)) fail(where, 'kind "' + String(kind) + '" 不能放在「' + stage + '」里（可用：' + ALLOWED[stage as Stage].join('、') + '）');
      const str = (field: string) => {
        if (typeof b[field] !== 'string' || !b[field]) fail(where, '缺少字符串字段 ' + field);
        return b[field] as string;
      };
      if (kind === 'markdown') {
        str('src');
        return;
      }
      const id = str('id');
      str('icon');
      if (ids.has(id)) fail(where, 'id "' + id + '" 重复');
      ids.add(id);
      if (!ctx.copy[id + '.title']) fail(where, '文案表缺少 ' + id + '.title');
      if (kind === 'exercise') {
        str('file');
        str('package');
        if (!ctx.copy[id + '.body']) fail(where, '文案表缺少 ' + id + '.body');
        return;
      }
      const group = GROUP[kind]!;
      const name = str('rules');
      const have = Object.keys(ctx.rules[group] ?? {});
      if (!have.includes(name)) fail(where, 'rules "' + name + '" 不在引擎导出的 level.' + group + ' 里（有：' + (have.join('、') || '无') + '）');
      for (const field of ['scene', 'after']) {
        const v = b[field];
        if (field === 'after' && v === undefined) continue;
        if (typeof v !== 'string' || !ctx.scenes.includes(v)) fail(where, field + ' "' + String(v) + '" 不在画面注册表里（有：' + ctx.scenes.join('、') + '）');
      }
      if (b.frame !== undefined && b.frame !== 'game' && b.frame !== 'stage') fail(where, 'frame 只能是 game 或 stage');
      if (b.sayLines !== undefined && b.sayLines !== 1 && b.sayLines !== 2) fail(where, 'sayLines 只能是 1 或 2');
      if (b.saySize !== undefined && b.saySize !== 'small') fail(where, 'saySize 只能是 small');
    });
    out[stage as Stage] = blocks as Block[];
  }
  if (!Object.keys(out).length) fail('', '一步都没有');
  return out;
}
