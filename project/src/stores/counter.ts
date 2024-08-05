import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore(
  'counter',
  () => {
    const count = ref(0)
    const doubleCount = computed(() => count.value * 2)
    function increment() {
      count.value++
    }

    return { count, doubleCount, increment }
  },
  // store持久化 默认使用localStorage进行存储
  { persist: true }
)
