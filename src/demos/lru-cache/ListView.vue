<script setup lang="ts">
import { computed } from 'vue';
import type { Item } from '../../engine/lru-cache';

// 链表和哈希表：逐步执行、猜下一步、找 bug 共用，只负责画。
// 链表左边是最久没用的（head.next），右边是最近用过的（tail.prev）。
const props = withDefaults(defineProps<{
  list: Item[];
  cap: number;
  /** 哈希表里有哪些 key，不传就不画哈希表 */
  mapKeys?: number[] | null;
  /** 手里拿着、暂时不在链表上的节点 */
  hand?: Item | null;
  focus?: number | null;
  evicted?: number | null;
  /** 点链表上的节点（猜下一步用） */
  clickable?: boolean;
  /** 盖住值，只显示 key（猜下一步用不到值时） */
  hideValues?: boolean;
}>(), { mapKeys: null, hand: null, focus: null, evicted: null, clickable: false, hideValues: false });

const emit = defineEmits<{ pick: [k: number] }>();

const ghosts = computed(() => (props.mapKeys ?? []).filter((k) => !props.list.some((x) => x.k === k) && props.hand?.k !== k));
const over = computed(() => props.list.length > props.cap || (props.mapKeys?.length ?? 0) > props.cap);
</script>

<template>
  <div class="lv">
    <div class="ends" aria-hidden="true"><span>⬅️ 最久没用</span><span>最近用过 ➡️</span></div>
    <div class="chain" role="list" aria-label="双向链表，从最久没用到最近用过">
      <span class="sent" role="listitem">head</span>
      <template v-for="(n, i) in list" :key="i">
        <span class="arrow" aria-hidden="true">⇄</span>
        <component
          :is="clickable ? 'button' : 'span'"
          :type="clickable ? 'button' : undefined"
          class="node"
          :class="{ focus: n.k === focus, can: clickable }"
          role="listitem"
          :aria-label="'节点 ' + n.k + (hideValues ? '' : '，值 ' + n.v)"
          @click="clickable && emit('pick', n.k)"
        >{{ n.k }}<small v-if="!hideValues">={{ n.v }}</small></component>
      </template>
      <span class="arrow" aria-hidden="true">⇄</span>
      <span class="sent" role="listitem">tail</span>
    </div>
    <p class="status" aria-live="polite">
      <template v-if="hand">✋ 手里拿着节点 {{ hand.k }}，它暂时不在链表上</template>
      <template v-else-if="evicted !== null">👋 {{ evicted }} 被淘汰了</template>
      <template v-else>&nbsp;</template>
    </p>
    <div v-if="mapKeys" class="map">
      <span class="cap-label">HashMap</span>
      <span v-for="k in mapKeys" :key="k" class="mk" :class="{ ghost: ghosts.includes(k) }">{{ k }} → 节点<template v-if="ghosts.includes(k)"> 👻</template></span>
      <span v-if="!mapKeys.length" class="cap-label">（空）</span>
      <span class="size" :class="{ over }">size {{ mapKeys.length }} / 容量 {{ cap }}</span>
    </div>
  </div>
</template>

<style scoped>
.lv { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ends { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); }
.chain { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-height: 44px; }
.sent {
  font: 600 12px var(--mono); color: var(--muted); padding: 6px 8px;
  border: 1.5px dashed var(--line); border-radius: 6px;
}
.arrow { color: var(--muted); font-size: 14px; }
.node {
  font: 600 15px var(--mono); color: var(--fg); background: var(--bg); padding: 7px 10px;
  border: 1.5px solid var(--line); border-radius: 8px; transition: background 0.2s, border-color 0.2s;
}
.node small { font: 400 12px var(--mono); color: var(--muted); }
.node.focus { background: var(--mid); color: var(--mid-ink); border-color: var(--mid); }
.node.focus small { color: var(--mid-ink); }
.node.can { cursor: pointer; }
.node.can:hover { border-color: var(--accent); }
.node:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.status { font-size: 14px; color: var(--muted); min-height: 1.5em; }
.map { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.cap-label { font-size: 12px; color: var(--muted); }
.mk { font: 500 13px var(--mono); padding: 3px 8px; border: 1.5px solid var(--line); border-radius: 6px; background: var(--bg); }
.mk.ghost { border-color: var(--warn); color: var(--warn); }
.size { font: 500 12px var(--mono); color: var(--muted); margin-left: auto; }
.size.over { color: var(--warn); font-weight: 700; }
</style>
