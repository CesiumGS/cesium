<script setup lang="ts">
import { ref } from 'vue'
import menuManage from '../menuManage/index.vue'
import setting from './setting.vue'

const activeIndex = ref('1')

const handleSelect = (val: string) => {
  activeIndex.value = val
}
defineOptions({
  name: 'InitSystem'
})
</script>

<template>
  <div  class="init-container">
    <div class="menu-con">
      <el-menu
        :default-active="activeIndex"
        class="el-menu-demo"
        mode="horizontal"
        @select="handleSelect"
      >
        <el-menu-item index="1">页面配置</el-menu-item>
        <el-menu-item index="2">菜单配置</el-menu-item>
      </el-menu>
    </div>
    <div class="main">
      <setting v-if="activeIndex === '1'" />
      <menu-manage v-else />
    </div>
  </div>
</template>

<style scoped lang="scss">
.init-container {
  width: 100%;
  height: 100%;
  .menu-con {
    width: 100%;
    height: 60px;
  }
  .main {
    width: 100%;
    height: calc(100% - 60px);
  }
}
</style>
