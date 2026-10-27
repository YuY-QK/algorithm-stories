import * as engine from '../../../../engine/linear-search';
import BugBoxes from './BugBoxes.vue';
import ChallengeLead from './ChallengeLead.vue';
import ChallengeNote from './ChallengeNote.vue';
import LookBoxes from './LookBoxes.vue';
import PlayBoxes from './PlayBoxes.vue';
import PlayRobot from './PlayRobot.vue';
import PredictBoxes from './PredictBoxes.vue';
import TraceBoxes from './TraceBoxes.vue';

// 顺序查找的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugBoxes, ChallengeLead, ChallengeNote, LookBoxes, PlayBoxes, PlayRobot, PredictBoxes, TraceBoxes },
};
