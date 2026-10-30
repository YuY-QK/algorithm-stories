import * as engine from '../../../../engine/quick-sort';
import BugParts from './BugParts.vue';
import ChallengeQuiz from './ChallengeQuiz.vue';
import LookLine from './LookLine.vue';
import PickLesson from './PickLesson.vue';
import PlayPick from './PlayPick.vue';
import PlayStand from './PlayStand.vue';
import PredictParts from './PredictParts.vue';
import StandNote from './StandNote.vue';
import TraceParts from './TraceParts.vue';
import TraceStack from './TraceStack.vue';

// 快速排序的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugParts, ChallengeQuiz, LookLine, PickLesson, PlayPick, PlayStand, PredictParts, StandNote, TraceParts, TraceStack },
};
