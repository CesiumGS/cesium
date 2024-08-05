import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import routes from './routes'
import { useUserStore } from '../store/useUser'
import useMenuStore from '@/components/layout/store/menu'

const view = import.meta.glob('../../../**/**/**.vue')
const whiteList = ['/login', '/init']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export function resetRouter (router: any) {
  router.getRoutes().forEach((route: any) => {
    const { name } = route;   //获取路由name
    const index = routes.findIndex((r) => r.name === name)
    if (name && index < 0) {
      router.hasRoute(name) && router.removeRoute(name);
    }
  });
}

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()
  Http.abortAll()
  NProgress.start()
  if (to.path === '/login') {
    next()
    return
  }
  // 判断该用户是否登录
  if (userStore.isLogin) {
    // 检查用户是否已获得其权限角色
    if (userStore.isLogin && router.getRoutes().length === routes.length) {
      try {
        for (const m of userStore.flatMenu) {
          const tem = JSON.parse(JSON.stringify(m))
          tem.name = tem.id
          if (!tem.component) continue
          tem.component = view[tem.component] || (() => import('@/components/layout/component/infoPage/errorPath.vue'))
          router.addRoute(tem)
        }
        console.log(router.getRoutes())
        userStore.currentRoute = to.path
        next({ path: to.path, query: to.query, replace: true })
      } catch (err: any) {
        // 过程中发生任何错误，都直接重置 Token，并重定向到登录页面
        userStore.currentRoute = '/login'
        next('/login')
      }
    } else {
      const menuStore = useMenuStore()
      if (!menuStore.isMenuSkip) menuStore.setActive(to.path)
      else menuStore.isMenuSkip = false
      userStore.currentRoute = to.path
      next()
    }
  } else {
    // 如果没有 Token
    if (whiteList.indexOf(to.path) !== -1) {
      // 如果在免登录的白名单中，则直接进入
      userStore.currentRoute = to.path
      next()
    } else {
      // 其他没有访问权限的页面将被重定向到登录页面
      userStore.currentRoute = '/login'
      next('/login')
    }
  }
})

router.afterEach(() => {
  // NProgress.done()
})

export default router
