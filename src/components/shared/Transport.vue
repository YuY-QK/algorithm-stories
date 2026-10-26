<script setup lang="ts">
import type { Player } from './usePlayer';
import { t } from '../../i18n/runtime';

// 播放控制条：重置、上一步、播放/暂停、下一步、速度。额外按钮放进默认插槽。
defineProps<{ player: Player }>();
</script>

<template>
  <div class="transport">
    <button type="button" class="btn small" :disabled="player.atStart.value" @click="player.reset()">{{ t('player.reset') }}</button>
    <button type="button" class="btn small" :disabled="player.atStart.value" @click="player.prev()">{{ t('player.prev') }}</button>
    <button type="button" class="btn small primary" @click="player.toggle()">{{ t(player.manual.value ? 'player.step' : player.playing.value ? 'player.pause' : 'player.play') }}</button>
    <button type="button" class="btn small" :disabled="player.atEnd.value" @click="player.next()">{{ t('player.next') }}</button>
    <slot />
    <label class="speed">{{ t('player.speed') }}
      <select v-model.number="player.speed.value">
        <option v-for="s in player.speeds" :key="s.ms" :value="s.ms">{{ t(s.label) }}</option>
      </select>
    </label>
  </div>
</template>
