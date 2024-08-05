<script setup>
import { ref } from 'vue'
import { useColorStore } from '@/components/layout/store/useColorStore'
import { Search, Message, Delete, Star, Edit, Check } from '@element-plus/icons'

const themeName = ref('默认主题')
const colorStore = useColorStore()

let _theme = [
  {
    label: '默认主题',
    color: [['primary', '#409EFF'], ['success', '#67C23A'], ['warning', '#E6A23C'], ['danger', '#F56C6C'], ['error', '#F56C6C'], ['info', '#909399']]
  },
  {
    label: '自定义主题1',
    color: [['primary', '#1984f3'], ['success', '#55DE12'], ['warning', '#EA9412'], ['danger', '#E12020'], ['error', '#E12020'], ['info', '#209399']]
  },
  {
    label: '自定义主题2',
    color: [['primary', '#0A4680'], ['success', '#276409'], ['warning', '#815410'], ['danger', '#931d1d'], ['error', '#931D1D'], ['info', '#454A55']]
  }
]

function setThemeColor(colorMap, label) {
  themeName.value = label
  colorStore.setThemeColor(colorMap)
}

</script>


<template>
  <main>
    <el-row style="margin-bottom: 15px">
      <div class="demo-color-warp">
        <div
          v-for="(item, key) in _theme" :key="key" class="demo-color-box"
          :style="{'--color':item.color[0][1]}"
          @click="setThemeColor(item.color, item.label)">
          <span class="demo-color__label">{{ item.label }}</span>
          <span class="demo-color__value">{{ item.color[0][0] }}</span>
          <span class="demo-color__value">{{ item.color[0][1] }}</span>
          <ul class="demo-color__list">
            <template v-for="(colorItem, colorKey) in item.color" :key="colorKey">
              <li v-if="colorKey>0" :style="{'--color':colorItem[1]}">
                <!--                <span>{{ colorItem[0] }}</span>-->
                <!--                <span>{{ colorItem[1] }}</span>-->
              </li>
            </template>
          </ul>
        </div>
      </div>
      <span>当前主题：{{ themeName }}</span>
    </el-row>

    <el-row class="mb-4">
      <el-button>Default</el-button>
      <el-button type="primary">Primary</el-button>
      <el-button type="success">Success</el-button>
      <el-button type="info">Info</el-button>
      <el-button type="warning">Warning</el-button>
      <el-button type="danger">Danger</el-button>
    </el-row>

    <el-row class="mb-4">
      <el-button plain>Plain</el-button>
      <el-button type="primary" plain>Primary</el-button>
      <el-button type="success" plain>Success</el-button>
      <el-button type="info" plain>Info</el-button>
      <el-button type="warning" plain>Warning</el-button>
      <el-button type="danger" plain>Danger</el-button>
    </el-row>

    <el-row class="mb-4">
      <el-button round>Round</el-button>
      <el-button type="primary" round>Primary</el-button>
      <el-button type="success" round>Success</el-button>
      <el-button type="info" round>Info</el-button>
      <el-button type="warning" round>Warning</el-button>
      <el-button type="danger" round>Danger</el-button>
    </el-row>

    <el-row>
      <el-button :icon="Search" circle />
      <el-button type="primary" :icon="Edit" circle />
      <el-button type="success" :icon="Check" circle />
      <el-button type="info" :icon="Message" circle />
      <el-button type="warning" :icon="Star" circle />
      <el-button type="danger" :icon="Delete" circle />
    </el-row>
  </main>
</template>


<style scoped lang="scss">

</style>
