<script setup lang="ts">
import type { Player } from './usePlayer';

// 播放控制条：重置、上一步、播放/暂停、下一步、速度。额外按钮放进默认插槽。
withDefaults(defineProps<{
  player: Player;
  /** 按钮文字，默认中文；新页面（ui/vue/widgets）按文案表传入 */
  labels?: Record<'reset' | 'prev' | 'play' | 'pause' | 'step' | 'next' | 'speed', string>;
}>(), {
  labels: () => ({ reset: '重置', prev: '上一步', play: '播放', pause: '暂停', step: '走一步', next: '下一步', speed: '速度' }),
});
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
