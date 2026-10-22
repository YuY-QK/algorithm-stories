import type { Level } from './content.config';

/** 四个等级的显示名和对象，和 CLAUDE.md 里的分级一致 */
export const LEVEL_INFO: Record<Level, { name: string; who: string; how: string }> = {
  kid: { name: '初级', who: '小朋友', how: '故事加点选和拖拽，不写代码' },
  beginner: { name: '进阶', who: '初学者', how: '可视化加逻辑拼接' },
  mid: { name: '中级', who: '在校生、转行者', how: '可视化加简单代码' },
  pro: { name: '高级', who: 'IT 从业者', how: '逐步执行、代码、复杂度对比、工程应用' },
};
