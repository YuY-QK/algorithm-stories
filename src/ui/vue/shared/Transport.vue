<script setup lang="ts">
import type { Player } from './usePlayer';

// 播放控制条：重置、上一步、播放/暂停、下一步、速度。额外按钮放进默认插槽。
defineProps<{
  player: Player;
  /** 按钮文字，按文案表传入 */
  labels: Record<'reset' | 'prev' | 'play' | 'pause' | 'step' | 'next' | 'speed', string>;
}>();
</script>

<template>
  <div class="transport">
    <button type="button" class="btn small" :disabled="player.atStart.value" @click="player.reset()">{{ labels.reset }}</button>
    <button type="button" class="btn small" :disabled="player.atStart.value" @click="player.prev()">{{ labels.prev }}</button>
    <button type="button" class="btn small primary" @click="player.toggle()">{{ player.manual.value ? labels.step : player.playing.value ? labels.pause : labels.play }}</button>
    <button type="button" class="btn small" :disabled="player.atEnd.value" @click="player.next()">{{ labels.next }}</button>
    <slot />
    <label class="speed">{{ labels.speed }}
      <select v-model.number="player.speed.value">
        <option v-for="s in player.speeds" :key="s.ms" :value="s.ms">{{ s.label }}</option>
      </select>
    </label>
  </div>
</template>
