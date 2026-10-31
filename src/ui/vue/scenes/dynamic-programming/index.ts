import * as engine from '../../../../engine/dynamic-programming';
import BugDp from './BugDp.vue';
import ChallengeGrid from './ChallengeGrid.vue';
import GridMsg from './GridMsg.vue';
import LookStairs from './LookStairs.vue';
import NotesBig from './NotesBig.vue';
import PlayCount from './PlayCount.vue';
import PlayNotes from './PlayNotes.vue';
import PredictDp from './PredictDp.vue';
import TraceDp from './TraceDp.vue';

// 动态规划的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugDp, ChallengeGrid, GridMsg, LookStairs, NotesBig, PlayCount, PlayNotes, PredictDp, TraceDp },
};
