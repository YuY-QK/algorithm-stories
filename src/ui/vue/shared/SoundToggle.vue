<script setup lang="ts">
import { muted, play, setMuted } from './sound';

// 页面右上角的音效开关，所有关卡共用
function toggle() {
  setMuted(!muted.value);
  play('tap');
}
</script>

<template>
  <button type="button" class="sound-toggle" :aria-pressed="!muted" :aria-label="muted ? '打开音效' : '关闭音效'" @click="toggle">
    {{ muted ? '🔇' : '🔊' }}
  </button>
</template>

<style scoped>
.sound-toggle {
  min-width: 44px;
  min-height: 44px;
  font-size: 1.3rem;
  border: 1px solid var(--line, currentColor);
  border-radius: 999px;
  background: var(--bg, transparent);
  color: inherit;
  cursor: pointer;
}
</style>
