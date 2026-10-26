import { m, t } from '../../core/i18n';
import type { Copy, Msg } from '../../core/types';

/** LevelPage 把整页的文案表写在这个 JSON 里，每页一份，各控件自己读 */
export const COPY_ELEMENT_ID = 'level-copy';

let cached: Copy | null = null;
function pageCopy(): Copy {
  if (!cached) cached = JSON.parse(document.getElementById(COPY_ELEMENT_ID)?.textContent ?? '{}') as Copy;
  return cached;
}

/** 界面里取文字的小工具：tr 填 Msg（或原样返回字符串），ui 取共用文案（ui.* 键），has 查本关有没有某个键 */
export function useCopy(copy: Copy = pageCopy()) {
  return {
    has: (key: string) => copy[key] !== undefined,
    tr: (msg: Msg | string | number) => t(msg, copy),
    ui: (key: string, params?: Msg['params']) => t(m(key, params), copy),
  };
}

export type Tr = ReturnType<typeof useCopy>['tr'];
