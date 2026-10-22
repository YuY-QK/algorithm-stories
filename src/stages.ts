import type { Stage } from './content.config';

/** 关卡的四步，和 docs/overview.md 4a 的模板一致 */
export const STAGE_INFO: Record<Stage, { icon: string; name: string; who: string; how: string }> = {
  look: { icon: '👀', name: '看', who: '一起看', how: '会动的绘本，图形和动画讲清楚算法在做什么' },
  play: { icon: '🎮', name: '玩', who: '孩子停在这里', how: '小游戏，孩子当主角，在提示里自己发现规律' },
  do: { icon: '🛠️', name: '做', who: '大人继续', how: '猜下一步、找 bug、亲手写 Kotlin、挑战' },
  more: { icon: '📖', name: '延伸', who: '通关以后', how: '复杂度和真实世界里的用法' },
};
