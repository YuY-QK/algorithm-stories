import * as engine from '../../../../engine/insertion-sort';
import BugRow from './BugRow.vue';
import ChallengeRace from './ChallengeRace.vue';
import LookHand from './LookHand.vue';
import PlayPlace from './PlayPlace.vue';
import PlayShift from './PlayShift.vue';
import PredictRow from './PredictRow.vue';
import RaceNote from './RaceNote.vue';
import TraceRow from './TraceRow.vue';

// 插入排序的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugRow, ChallengeRace, LookHand, PlayPlace, PlayShift, PredictRow, RaceNote, TraceRow },
};
