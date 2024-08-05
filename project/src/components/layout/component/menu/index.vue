<template>
  <el-menu :default-active="menuStore.active[index.show]" v-bind="$attrs" :unique-opened="true">
    <MenuItem :menu-list="menuList" />
  </el-menu>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import MenuItem from '../menuItem/index.vue'
import useMenuStore from '@/components/layout/store/menu'

defineOptions({
  name: 'MenuContainer'
})

// 使用仓库
const menuStore = useMenuStore()
const props = defineProps<{ level: string }>()
const index = reactive<{ show: string; level: string }>({ show: '', level: '' })

const getMenu = () => {
  const ind = menuStore.level.indexOf(props.level)
  if (ind < 0) console.error(`菜单等级(level)配置错误, 需在包含${menuStore.level}中, 且不可重复!`)
  else if (ind === 0) index.show = menuStore.level?.[0]
  else Object.assign(index, { show: menuStore.level?.[ind], level: menuStore.level?.[ind - 1] })
}

getMenu()

const menuList = computed(() => (index.level ? menuStore.menu?.[index.show]?.[menuStore.active?.[index.level]] : menuStore.menu?.[index.show] || []))

defineExpose({
  menuList
})
</script>
<style lang="scss" scoped></style>
