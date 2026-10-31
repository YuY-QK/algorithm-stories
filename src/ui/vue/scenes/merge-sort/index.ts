import * as engine from '../../../../engine/merge-sort';
import BugMerge from './BugMerge.vue';
import ChallengeBoard from './ChallengeBoard.vue';
import ChallengeResult from './ChallengeResult.vue';
import LookQueues from './LookQueues.vue';
import PlayMerge from './PlayMerge.vue';
import PlaySplit from './PlaySplit.vue';
import PredictMerge from './PredictMerge.vue';
import TraceMerge from './TraceMerge.vue';

// 归并排序的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugMerge, ChallengeBoard, ChallengeResult, LookQueues, PlayMerge, PlaySplit, PredictMerge, TraceMerge },
};
