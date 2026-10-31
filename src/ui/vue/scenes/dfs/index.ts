import * as engine from '../../../../engine/dfs';
import BugGrid from './BugGrid.vue';
import ChallengeGrid from './ChallengeGrid.vue';
import LookGrid from './LookGrid.vue';
import Note from './Note.vue';
import PlayExplore from './PlayExplore.vue';
import PlayIslands from './PlayIslands.vue';
import PredictGrid from './PredictGrid.vue';
import TraceGrid from './TraceGrid.vue';

// DFS 的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugGrid, ChallengeGrid, LookGrid, Note, PlayExplore, PlayIslands, PredictGrid, TraceGrid },
};
