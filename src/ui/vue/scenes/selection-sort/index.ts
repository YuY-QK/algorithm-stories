import * as engine from '../../../../engine/selection-sort';
import BugCandies from './BugCandies.vue';
import ChallengeCells from './ChallengeCells.vue';
import LookCandies from './LookCandies.vue';
import PickTally from './PickTally.vue';
import PlayHand from './PlayHand.vue';
import PlayPick from './PlayPick.vue';
import PredictCells from './PredictCells.vue';
import TraceCandies from './TraceCandies.vue';

// 选择排序的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugCandies, ChallengeCells, LookCandies, PickTally, PlayHand, PlayPick, PredictCells, TraceCandies },
};
