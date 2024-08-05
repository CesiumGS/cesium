<template>
  <template v-for="item in props.menuList" :key="item.id">
    <!-- 没有子路由 -->
    <template v-if="!item.children">
      <el-menu-item v-if="item.show" :key="item.id" :index="item.id as string" @click="goRoute(item)">
        <i v-if="item.icon" :class="`iconfont ${item.icon}`"></i>
        <span>{{ item.name }}</span>
      </el-menu-item>
    </template>
    <!-- 多个子路由 -->
    <el-sub-menu v-if="item.children && item.children.length >= 1" :key="item.id" :index="item.id as string">
      <template #title>
        <i v-if="item.icon" :class="`iconfont ${item.icon}`"></i>
        <span>{{ item.name }}</span>
      </template>
      <!-- 递归展示子路由 -->
      <MenuItem :menu-list="item.children"></MenuItem>
    </el-sub-menu>
  </template>
</template>

<script setup lang="ts">
import useMenuStore, { findChild } from '@/components/layout/store/menu'
import type { Menu } from '@/components/layout/store/menu'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/useUser'

defineOptions({
  name: 'MenuItem'
})

// 获取父组件中所有的路由数据
const props = defineProps<{ menuList: Menu[] }>()

const emit = defineEmits(['select'])
const menuStore = useMenuStore()
const userStore = useUserStore()
const router = useRouter()
const goRoute = (menu: Menu) => {
  menuStore.active[menu.level] = menu.id
  if (menuStore.menuChange) menuStore.menuChange()
  let id = ''
  for (const key of menuStore.level) {
    if (!menuStore.active[key]) break
    id = menuStore.active[key]
  }
  const index = userStore.flatMenu.findIndex((m: Menu) => id === m.id)
  const child: Menu = findChild(userStore.flatMenu[index], menuStore.level, userStore.flatMenu)
  if (child.path) {
    router.push(child.path)
    menuStore.isMenuSkip = true
  }
  emit('select', menu)
}
</script>
