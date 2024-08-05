import { createRouter, createWebHistory } from 'vue-router'
import routes from '@/router/routes'
import NProgress from 'nprogress'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(() => {
  Http.abortAll()
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
