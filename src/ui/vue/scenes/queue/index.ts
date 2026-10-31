import * as engine from '../../../../engine/queue';
import BugQueue from './BugQueue.vue';
import GuessCells from './GuessCells.vue';
import GuessResult from './GuessResult.vue';
import Icon from './Icon.vue';
import LookSeats from './LookSeats.vue';
import PlayClerk from './PlayClerk.vue';
import PlayNext from './PlayNext.vue';
import PredictRing from './PredictRing.vue';
import ServedCompare from './ServedCompare.vue';
import TraceQueue from './TraceQueue.vue';

// 队列的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugQueue, GuessCells, GuessResult, Icon, LookSeats, PlayClerk, PlayNext, PredictRing, ServedCompare, TraceQueue },
};
