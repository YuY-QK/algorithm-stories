import { ref } from 'vue';

/** 猜下一步的连对计数：连对 goal 次过关，答错清零（过关后保持 passed） */
export function useStreak(goal = 5) {
  const streak = ref(0);
  const passed = ref(false);
  function hit() {
    streak.value++;
    if (streak.value >= goal) passed.value = true;
  }
  function miss() {
    streak.value = 0;
  }
  return { streak, passed, hit, miss };
}
