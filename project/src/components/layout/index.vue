<template>
  <div class="layout-container">
    <div v-if="!route.meta?.hiddenMenu" class="main-top" :style="{ background: config.background }">
      <div class="logo">
        <div class="dec-item"></div>
        <img class="cloud" :src="img.cloud" alt="" />
        <div class="title">{{ config.logoTitle }}</div>
      </div>
      <Menu
        class="menu-1"
        :level="menuStore.level[0]"
        :collapse-transition="true"
        text-color="#c6dbff"
        active-text-color="#fff"
        mode="horizontal"
      >
      </Menu>
      <ul class="infos">
        <li v-if="config.showTime">{{ time }}</li>
        <li class="user-info" @click="visible = true">
          <span class="info-content">
            <i class="iconfont icon-yonghuguanli" />
            <span>{{ userInfo.realName }}</span>
          </span>
        </li>
        <li v-if="userInfo.roleId === 1" style="cursor: pointer;" @click="refresh">刷新</li>
        <li v-if="config.logout">
          <el-popconfirm title="确定退出系统?" confirm-button-text="确认" cancel-button-text="取消" @confirm="loginOut">
            <template #reference>
              <i class="iconfont icon-tuichu" />
            </template>
          </el-popconfirm>
        </li>
      </ul>
    </div>
    <div class="main-wrapper">
      <custom-menu v-if="!route.meta?.hiddenMenu" :level="menuStore.level[1]"></custom-menu>
      <div :class="{ 'router-main': !route.meta?.hiddenMenu, 'signal-main': route.meta?.hiddenMenu }">
        <router-view v-slot="{ Component }">
          <keep-alive :exclude="exclude">
            <component :is="wrap($route.fullPath, Component)" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
<!--  <password-edit v-model="visible"></password-edit>-->
</template>

<script setup lang="ts">
import { ref, h, onMounted, onBeforeMount, computed, toRefs } from 'vue'
import useMenuStore from '@/components/layout/store/menu'
import { useUserStore } from '@/components/layout/store/useUser'
import Menu from '@/components/layout/component/menu/index.vue'
import customMenu from '@/components/layout/component/customMenu/index.vue'
import { useRouter, useRoute } from 'vue-router'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import img from './utils/img'
import { resetRouter } from './router'
import config from './json/config.json'

defineOptions({
  name: 'LayoutPage'
})

const cacheMap = new Map()
const menuStore = useMenuStore()
const user = useUserStore()
const route = useRoute()
const router = useRouter()
const collapse = ref(false)
const visible = ref(false)
const time = ref(`${dayjs().format('YYYY-MM-DD HH:mm:dd')} ${dayjs().locale('zh-cn').format('dddd')}`)
const timer = ref()
const { userInfo, exclude, isLogin, flatMenu } = toRefs(useUserStore())
const sideList = computed(() => menuStore.menu[menuStore.level[1]]?.[menuStore.active[menuStore.level[0]]] || [])

const wrap = (name: string, component: any) => {
  let cache
  const cacheName = name
  if (cacheMap.has(cacheName)) {
    cache = cacheMap.get(cacheName)
  } else {
    cache = {
      name: cacheName,
      render() {
        return h('div', { className: 'cache-page-wrapper' }, component)
      }
    }
    cacheMap.set(cacheName, cache)
  }
  return h(cache)
}

function loginOut() {
  const password = localStorage.getItem('password'),
    username = localStorage.getItem('username')
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('password', password || '')
  localStorage.setItem('username', username || '')
  isLogin.value = false
  resetRouter(router)
  removeKeepAliveCache()
  router.push('/login')
}

// 需要删除的时候
const removeKeepAliveCache = () => {
  exclude.value = flatMenu.value.map((menu: any) => menu.path)
}

function startRequestTime() {
  timer.value = requestAnimationFrame(() => {
    time.value = `${dayjs().format('YYYY-MM-DD HH:mm:ss')} ${dayjs().locale('zh-cn').format('dddd')}`
    startRequestTime()
  })
}

async function refresh() {
  if (sessionStorage.getItem('token')) await user.getUserInfo()
}

onMounted(() => {
  refresh()
  startRequestTime()
})

onBeforeMount(() => cancelAnimationFrame(timer.value))
</script>
<style lang="scss" scoped>
@import 'style/index';
</style>
