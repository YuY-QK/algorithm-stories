<script setup lang="ts">
import type { Player } from './usePlayer';

// 播放控制条：重置、上一步、播放/暂停、下一步、速度。额外按钮放进默认插槽。
defineProps<{ player: Player }>();
</script>

<template>
  <div class="transport">
    <button type="button" class="btn small" :disabled="player.atStart.value" @click="player.reset()">重置</button>
    <button type="button" class="btn small" :disabled="player.atStart.value" @click="player.prev()">上一步</button>
    <button type="button" class="btn small primary" @click="player.toggle()">{{ player.playing.value ? '暂停' : '播放' }}</button>
    <button type="button" class="btn small" :disabled="player.atEnd.value" @click="player.next()">下一步</button>
    <slot />
    <label class="speed">速度
      <select v-model.number="player.speed.value">
        <option v-for="s in player.speeds" :key="s.ms" :value="s.ms">{{ s.label }}</option>
      </select>
    </label>
  </div>
</template>
