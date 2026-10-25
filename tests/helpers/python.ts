/**
 * 和 Python 参考实现对拍用的小工具。每个算法一个 tests/<slug>.crosscheck.test.ts，
 * 用 describe.skipIf(!hasPython()) 包起来，没装 python3 的环境会跳过。
 */
import { execFileSync } from 'node:child_process';

export function hasPython(): boolean {
  try {
    execFileSync('python3', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/** 在 content/algorithms/<dir> 下运行一段 Python，input 经 stdin 以 JSON 传入，返回它打印的 JSON */
export function runPython(dir: string, code: string, input: unknown): unknown {
  const out = execFileSync('python3', ['-c', code], {
    cwd: `content/algorithms/${dir}`,
    input: JSON.stringify(input),
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out.toString());
}
