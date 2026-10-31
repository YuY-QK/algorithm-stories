import * as engine from '../../../../engine/hash-lookup';
import BugShelves from './BugShelves.vue';
import ChallengeBoard from './ChallengeBoard.vue';
import ChallengeNote from './ChallengeNote.vue';
import LookShelves from './LookShelves.vue';
import ModeIcon from './ModeIcon.vue';
import PlayClash from './PlayClash.vue';
import PlayWalk from './PlayWalk.vue';
import PredictShelves from './PredictShelves.vue';
import TraceShelves from './TraceShelves.vue';

// 哈希查找的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugShelves, ChallengeBoard, ChallengeNote, LookShelves, ModeIcon, PlayClash, PlayWalk, PredictShelves, TraceShelves },
};
