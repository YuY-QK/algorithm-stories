import * as engine from '../../../../engine/stack';
import BugBracket from './BugBracket.vue';
import Icon from './Icon.vue';
import LookPlates from './LookPlates.vue';
import PermAfter from './PermAfter.vue';
import PermLanes from './PermLanes.vue';
import PlayBlocks from './PlayBlocks.vue';
import PlayPlates from './PlayPlates.vue';
import PredictBracket from './PredictBracket.vue';
import TraceBracket from './TraceBracket.vue';

// 栈的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugBracket, Icon, LookPlates, PermAfter, PermLanes, PlayBlocks, PlayPlates, PredictBracket, TraceBracket },
};
