import Login from '../component/login/index.vue'
import MenuManage from '@/components/layout/menuManage/index.vue'
import config from '@/components/layout/json/config.json'

const intiSystemRoute = [
  {
    path: '/init',
    name: 'init',
    component: () => import('@/components/layout/init/index.vue'),
    meta: {
      hiddenMenu: true
    },
  },

]

export default [
  {
    path: '/',
    name: 'Home',
    redirect: config.redirect
  },
  {
    path: '/login',
    component: Login,
    meta: {
      hiddenMenu: true
    },
    name: 'Login'
  },
  {
    path: '/menu',
    component: MenuManage,
    name: 'menu'
  },
  ...intiSystemRoute
]
