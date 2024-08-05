<script setup lang="ts">
import zhCn from 'element-plus/dist/locale/zh-cn.js'
import layout from '@/components/layout/index.vue'
import config from '@/components/layout/json/config.json'

document.title = config.title

const chart = {
  'title': '统计图',
  'elements': [
    {
      'prop': 'avgSum',
      'name': '时段平均'
    },
    {
      'prop': 'avalue',
      'name': '原值'
    },
    {
      'prop': 'groundData',
      'name': '常年值'
    },
    {
      'prop': 'amValue',
      'name': '距平',
      'seriesType': 'bar',
      'seriesProps': {
        'itemStyle': {}
      }
    }
  ],
  'list': [],
  'categoryProp': 'dateTime',
  'seriesType': 'line',
  'xAxisName': '时间',
  'yAxisName': '平均气温(℃)',
  'showElements': false,
  'multiple': true,
  'defaultChecked': [
    'avgSum',
    'avalue',
    'groundData',
    'amValue'
  ],
  'options': {
    'legend': {
      'width': 800,
      'type': 'scroll'
    },
    'tooltip': {
      'enterable': true,
      'confine': true
    }
  }
}
</script>

<template>
  <el-config-provider :locale="zhCn">
    <layout />
  </el-config-provider>
</template>

<style scoped></style>
