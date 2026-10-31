<script setup lang="ts" generic="T extends string | number">
// 分段选择按钮，用于数组大小、初始顺序这类少量选项
defineProps<{ legend: string; options: { value: T; label: string }[] }>();
const model = defineModel<T>({ required: true });
</script>

<template>
  <fieldset class="field">
    <legend>{{ legend }}</legend>
    <div class="seg">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        :aria-pressed="model === o.value"
        @click="model = o.value"
      >{{ o.label }}</button>
    </div>
  </fieldset>
</template>
