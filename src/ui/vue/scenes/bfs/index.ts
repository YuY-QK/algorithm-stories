import * as engine from '../../../../engine/bfs';
import BugMaze from './BugMaze.vue';
import ChallengeMaze from './ChallengeMaze.vue';
import LookMaze from './LookMaze.vue';
import PlayDraw from './PlayDraw.vue';
import PlayRings from './PlayRings.vue';
import PredictMaze from './PredictMaze.vue';
import TraceMaze from './TraceMaze.vue';

// BFS 的画面注册表：level.json 里的 scene 名字 → 组件。画面只收 props、emit act，不含流程。
export default {
  engine,
  scenes: { BugMaze, ChallengeMaze, LookMaze, PlayDraw, PlayRings, PredictMaze, TraceMaze },
};
