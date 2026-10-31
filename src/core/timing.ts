/**
 * 集中的速度与停顿常量。新关卡与迁移的关卡不许自己写速度数字，一律引用这里。
 * 数值的唯一来源是 src/theme/tokens.json 的 motion，以后调快慢只改那里。
 */
import tokens from '../theme/tokens.json';

export interface Speed {
  label: string;
  ms: number;
}

const motion = tokens.motion;

/** 速度档里的「手动」：点一下走一步 */
export const MANUAL = 0;

/** 逐步执行、找 bug 的速度档（毫秒/步，默认「中」）。ms 为 0 表示「手动」：点一下走一步，不自动播放 */
export const SPEEDS: Speed[] = motion.speeds;

/** 绘本自动翻页的间隔（毫秒） */
export const BOOK_INTERVAL = motion.BOOK_INTERVAL;

/** 「玩」里动画之间的停顿（毫秒） */
export const PAUSE_SHORT = motion.PAUSE_SHORT;
export const PAUSE_MID = motion.PAUSE_MID;
export const PAUSE_LONG = motion.PAUSE_LONG;
/** 「玩」「猜下一步」里逐个比较的动画节拍 */
export const PAUSE_START = motion.PAUSE_START;
export const PAUSE_TICK = motion.PAUSE_TICK;
export const PAUSE_BEAT = motion.PAUSE_BEAT;
export const PAUSE_HOLD = motion.PAUSE_HOLD;
export const PAUSE_ROUND = motion.PAUSE_ROUND;
/** 「玩」里一句提示读完再往下的停顿 */
export const PAUSE_NOTE = motion.PAUSE_NOTE;
/** 「玩」里一张牌挪一格、放下、再摸下一张的节拍 */
export const MOVE_STEP = motion.MOVE_STEP;
export const MOVE_SETTLE = motion.MOVE_SETTLE;
export const MOVE_NEXT = motion.MOVE_NEXT;
/** 牌答错后摇晃多久 */
export const SHAKE_MS = motion.SHAKE_MS;
/** 挑战赛跑动画的刷新间隔，和每次前进的步数 */
export const RACE_TICK = motion.RACE_TICK;
export const RACE_STRIDE = motion.RACE_STRIDE;
/** 「玩」里一队走光后，剩下的一个个跟上的间隔和收尾停顿 */
export const FOLLOW_STEP = motion.FOLLOW_STEP;
export const FOLLOW_END = motion.FOLLOW_END;
/** 「玩」里提示动画（透光、晃动）持续多久 */
export const FLASH_MS = motion.FLASH_MS;
/** 「玩」里涂一座岛：每格亮起的间隔，和涂完后的收尾停顿 */
export const FILL_STEP = motion.FILL_STEP;
export const FILL_END = motion.FILL_END;
/** 「玩」里答错后，让孩子看一眼再自动重来的停顿 */
export const PAUSE_RETRY = motion.PAUSE_RETRY;
/** 「猜下一步」里一格填好后，稍停一下再进入下一格（答错后补填的那次更短） */
export const PAUSE_BRIEF = motion.PAUSE_BRIEF;
/** 「玩」里点错后提示线、晃动持续多久 */
export const WIGGLE_MS = motion.WIGGLE_MS;
