<script setup lang="ts">
import { ref } from 'vue'
import { ArrowUp, ArrowDown } from '@element-plus/icons'

interface Prop {
  data: {
    name: string
    children: Prop['data']
    [name: string]: string | number | Prop['data'] | boolean
  }[]
}

const active = ref<number>(0)
const props = withDefaults(defineProps<Prop>(), {
  data: () => ([])
})
</script>

<template>
  <ul v-for="(item, index) in data[0]?.isFirst ? data[active].children : data" :key="index" class="menu-item">
    <div class="title-2">
      <div class="name">{{ item.name }}</div>
      <div v-if="item.children && item.children.length > 0" class="collapse-icon" @click="item.collapse = !item.collapse">
        <el-icon v-if="item.collapse"><ArrowUp /></el-icon>
        <el-icon v-else><ArrowDown /></el-icon>
      </div>
    </div>
    <ul v-if="item.children && item.children.length > 0" class="menu-item">
      <custom-item :data="item.children"></custom-item>
    </ul>
  </ul>
</template>

<style scoped lang="scss">
.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  height: 32px;
  background: rgba(50, 68, 103, 1);

  background-image: linear-gradient(89.38deg, #0AE4DC 0%, #008BFF 165.92%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  cursor: pointer;
}
.title-2 {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  .name {
    width: calc(100% - 15px);
    text-align: center;
    flex: 1;
  }
  .collapse-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
  }
}
</style>
