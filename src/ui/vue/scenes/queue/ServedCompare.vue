<script setup lang="ts">
import { m } from '../../../../core/i18n';
import type { Msg } from '../../../../core/types';

// 玩法一答错追问以后：把来的顺序和买到的顺序摆在一起比
defineProps<{ arrived: string[]; served: string[]; t: (msg: Msg) => string }>();
</script>

<template>
  <div class="compare">
    <p><span class="lbl">{{ t(m('next.cmp.arrived')) }}</span>{{ arrived.join(' ') }}</p>
    <p><span class="lbl">{{ t(m('next.cmp.served')) }}</span>{{ served.join(' ') }}</p>
  </div>
</template>

<style scoped>
.compare { display: flex; flex-direction: column; gap: 4px; font-size: 1.3rem; }
.lbl { display: inline-block; min-width: 5.5em; font-size: 0.75rem; color: var(--muted); }
</style>
