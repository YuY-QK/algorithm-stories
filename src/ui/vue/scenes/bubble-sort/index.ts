import * as engine from '../../../../engine/bubble-sort';
import BugBars from './BugBars.vue';
import ChallengeTrack from './ChallengeTrack.vue';
import LookLineup from './LookLineup.vue';
import Note from './Note.vue';
import PlayGuess from './PlayGuess.vue';
import PlayShoot from './PlayShoot.vue';
import PredictCells from './PredictCells.vue';
import TraceBars from './TraceBars.vue';

// 冒泡排序的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugBars, ChallengeTrack, LookLineup, Note, PlayGuess, PlayShoot, PredictCells, TraceBars },
};
