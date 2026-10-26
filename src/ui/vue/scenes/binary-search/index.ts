import * as engine from '../../../../engine/binary-search';
import BugArray from './BugArray.vue';
import GuessLog from './GuessLog.vue';
import GuessRange from './GuessRange.vue';
import LookStreet from './LookStreet.vue';
import MiniBoxes from './MiniBoxes.vue';
import PlayStreet from './PlayStreet.vue';
import PredictArray from './PredictArray.vue';
import TraceArray from './TraceArray.vue';

// 二分查找的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugArray, GuessLog, GuessRange, LookStreet, MiniBoxes, PlayStreet, PredictArray, TraceArray },
};
