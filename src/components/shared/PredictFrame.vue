<script setup lang="ts">
// 猜下一步的外框：连对和过关 chip、题干、答错提示、「下一题」。画面和答案按钮走插槽。
defineProps<{
  streak: number;
  goal: number;
  passed: boolean;
  prompt: string;
  /** 非空时显示 .oops-box 和「知道了，继续」 */
  wrong: string | null;
  /** 这一题结束，显示「下一题」 */
  ended: boolean;
}>();
const emit = defineEmits<{ continue: []; next: [] }>();
</script>

<template>
  <div class="stage">
    <div class="vars">
      <slot name="chips" />
      <span class="chip"><small>连对</small>{{ Math.min(streak, goal) }} / {{ goal }}</span>
      <span v-if="passed" class="chip win">🏅 过关</span>
    </div>
    <slot name="board" />
    <p class="note" aria-live="polite">{{ prompt }}</p>
    <slot name="answers" />
    <div v-if="wrong" class="oops-box">
      <p>❌ {{ wrong }}</p>
      <button type="button" class="btn small" @click="emit('continue')">知道了，继续</button>
    </div>
    <div v-if="ended" class="row">
      <button type="button" class="btn small primary" @click="emit('next')">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.win { border-color: var(--accent); color: var(--accent); }
</style>
