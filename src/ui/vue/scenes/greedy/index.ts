import * as engine from '../../../../engine/greedy';
import BugCoins from './BugCoins.vue';
import ChallengeSystem from './ChallengeSystem.vue';
import LookShop from './LookShop.vue';
import MiniCoins from './MiniCoins.vue';
import PlayCashier from './PlayCashier.vue';
import PlayRobot from './PlayRobot.vue';
import PredictCoins from './PredictCoins.vue';
import TraceCoins from './TraceCoins.vue';

// 贪心找零的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugCoins, ChallengeSystem, LookShop, MiniCoins, PlayCashier, PlayRobot, PredictCoins, TraceCoins },
};
