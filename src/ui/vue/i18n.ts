import { m, t } from '../../core/i18n';
import type { Copy, Msg } from '../../core/types';

/** 界面里取文字的两个小工具：tr 填 Msg（或原样返回字符串），ui 取共用文案（ui.* 键）。copy 由 LevelPage 传给每个控件 */
export function useCopy(copy: Copy) {
  return {
    tr: (msg: Msg | string | number) => t(msg, copy),
    ui: (key: string, params?: Msg['params']) => t(m(key, params), copy),
  };
}

export type Tr = ReturnType<typeof useCopy>['tr'];
