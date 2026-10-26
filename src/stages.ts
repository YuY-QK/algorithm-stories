import type { Stage } from './content.config';

/** 关卡的四步，和 docs/overview.md 4a 的模板一致。名字和说明在 common.json 的 stage.<步>.name / who / how */
export const STAGE_ICON: Record<Stage, string> = {
  look: '👀',
  play: '🎮',
  do: '🛠️',
  more: '📖',
};
