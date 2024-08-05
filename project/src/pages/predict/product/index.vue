<template>
  <h1>{{ route.fullPath }}</h1>
  <h1>Count: {{ count }}</h1>
  <h2>{{ formatted }}</h2>
  <el-button
    type="primary"
    @click="increment"
  >
    Increment
  </el-button>
  <el-button @click="dialogVisible = true">Open Dialog</el-button>
  <el-button @click="showMessage">Show Message</el-button>
  <el-button @click="showLoading">Show Loading</el-button>
  <el-dialog
    v-model="dialogVisible"
    title="Dialog title"
  >
    This is dialog!
  </el-dialog>
</template>

<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useDateFormat, useNow } from '@vueuse/core'
import { useRoute } from 'vue-router'

defineOptions({ name: 'HomePageX' })

const countStore = useCounterStore()
const { count } = storeToRefs(countStore)
const route = useRoute()
const { increment } = countStore

const dialogVisible = ref(false)
const formatted = useDateFormat(useNow(), 'YYYY-MM-DD HH:mm:ss')

function showLoading() {
  const close = Loading.show('body')
  setTimeout(close, 2000)
}
function showMessage() {
  Message.error('Some Error')
}
</script>

<style></style>
