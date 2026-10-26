/**
 * 二分查找的画面组件：名字和 src/levels/binary-search/level.ts 里的 view 对应。
 * 换平台时只重写这些（和共享的放映机），规则、文案、配置都不动。
 */
import Look from './Look.vue';
import PlayHide from './PlayHide.vue';
import PlayFind from './PlayFind.vue';
import Trace from './Trace.vue';
import Predict from './Predict.vue';
import Bug from './Bug.vue';
import Challenge from './Challenge.vue';

export default { Look, PlayHide, PlayFind, Trace, Predict, Bug, Challenge };
