/**
 * 集中的速度与停顿常量。新关卡与迁移的关卡不许自己写速度数字，一律引用这里。
 * 以后调快慢只改这个文件。
 */
import type { Speed } from './usePlayer';

/** 逐步执行、找 bug 的默认速度档（慢/中/快，毫秒/步） */
export const SPEEDS: Speed[] = [
  { label: '慢', ms: 1300 },
  { label: '中', ms: 800 },
  { label: '快', ms: 350 },
];

/** 绘本自动翻页的间隔（毫秒） */
export const BOOK_INTERVAL = 2200;

/** 「玩」里动画之间的停顿（毫秒） */
export const PAUSE_SHORT = 700;
export const PAUSE_MID = 800;
export const PAUSE_LONG = 900;
/** 「玩」「猜下一步」里逐个比较的动画节拍 */
export const PAUSE_START = 200;
export const PAUSE_TICK = 320;
export const PAUSE_BEAT = 500;
export const PAUSE_HOLD = 1500;
export const PAUSE_ROUND = 1800;
/** 「玩」里一句提示读完再往下的停顿 */
export const PAUSE_NOTE = 1100;
/** 「玩」里一张牌挪一格、放下、再摸下一张的节拍 */
export const MOVE_STEP = 380;
export const MOVE_SETTLE = 450;
export const MOVE_NEXT = 650;
/** 牌答错后摇晃多久 */
export const SHAKE_MS = 600;
/** 挑战赛跑动画的刷新间隔，和每次前进的步数 */
export const RACE_TICK = 30;
export const RACE_STRIDE = 2;
