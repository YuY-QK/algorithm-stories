import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

/** 椅子的读屏文字：几号椅子，坐着谁（或空着），队头队尾 */
export function seatLabel(t: (msg: Msg) => string, i: number, who: string | number | null, tag: string | null): string {
  return t(m('seat.name', { i })) + (who ? t(m('seat.who', { who })) : t(m('seat.vacant'))) + (tag ? t(m('seat.tag', { tag })) : '');
}

/** 队头、队尾的小标签 */
export function tagText(t: (msg: Msg) => string, kind: 'head' | 'tail' | 'both'): string {
  return t(kind === 'both' ? m('seat.both') : kind === 'head' ? m('seat.head') : m('seat.tail'));
}
