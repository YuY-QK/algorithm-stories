import * as engine from '../../../../engine/lru-cache';
import BugLru from './BugLru.vue';
import ChallengeReveal from './ChallengeReveal.vue';
import ChallengeSeq from './ChallengeSeq.vue';
import EvictDone from './EvictDone.vue';
import LookDesk from './LookDesk.vue';
import PlayEvict from './PlayEvict.vue';
import PlayTrips from './PlayTrips.vue';
import PredictLru from './PredictLru.vue';
import TraceLru from './TraceLru.vue';
import TripsDone from './TripsDone.vue';

// LRU 缓存的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugLru, ChallengeReveal, ChallengeSeq, EvictDone, LookDesk, PlayEvict, PlayTrips, PredictLru, TraceLru, TripsDone },
};
