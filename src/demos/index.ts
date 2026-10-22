import BinarySearch from './binary-search/Demo.astro';
import BubbleSort from './bubble-sort/Demo.astro';

/** 算法目录名 → 演示页组件。新增一个算法，在这里登记一行 */
export const DEMOS: Record<string, typeof BinarySearch> = {
  'binary-search': BinarySearch,
  'bubble-sort': BubbleSort,
};
