<script setup lang="ts">
// 猜下一步的外框：连对和过关 chip、题干、答错提示、「下一题」。画面和答案按钮走插槽。
withDefaults(defineProps<{
  streak: number;
  goal: number;
  passed: boolean;
  prompt: string;
  /** 非空时显示 .oops-box 和「知道了，继续」 */
  wrong: string | null;
  /** 这一题结束，显示「下一题」 */
  ended: boolean;
  /** 答对时的说明（非空时显示带「下一题」的绿边框，用于答对也要讲解的关卡，默认不用） */
  right?: string | null;
  /** 答错提示里按钮的文字 */
  continueLabel?: string;
  /** 答对说明里按钮的文字 */
  nextLabel?: string;
}>(), { right: null, continueLabel: '知道了，继续', nextLabel: '下一题' });
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
      <button type="button" class="btn small" @click="emit('continue')">{{ continueLabel }}</button>
    </div>
    <div v-if="right" class="oops-box right">
      <p>✅ {{ right }}</p>
      <button type="button" class="btn small primary" @click="emit('next')">{{ nextLabel }}</button>
    </div>
    <div v-if="ended" class="row">
      <button type="button" class="btn small primary" @click="emit('next')">下一题</button>
    </div>
  </div>
</template>

<style scoped>
.win { border-color: var(--accent); color: var(--accent); }
.oops-box.right { border-left-color: var(--accent); }
.oops-box p { overflow-wrap: anywhere; white-space: pre-line; }
</style>
