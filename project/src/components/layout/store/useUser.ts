import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import * as _ from 'lodash-es'
import type { Menu } from '@/components/layout/store/menu'
import useMenuStore from "@/components/layout/store/menu";
import config from '../json/config.json'
import m from '../json/menu.json'

export interface UserInfo {
  areaCode: string
  areaCodeHeader: string
  areaName: string
  areaType: number
  id: number
  menus: Menu[]
  realName: string
  roleId: number
  roleName: string
  username: string
}

export const useUserStore = defineStore(
  'userStore',
  () => {
    const baseLayerId = shallowRef(0)
    const riverAndRoadLayerId = shallowRef([3])
    const districtLayerId = shallowRef([2, 5])
    const isLogin = ref(false)
    const flatMenu = shallowRef<any>([])
    const currentRoute = ref('/')
    const exclude = ref<string[]>([])
    const userInfo = ref<UserInfo>({
      areaName: '山西省',
      areaCode: '',
      areaCodeHeader: '',
      areaType: 1,
      id: 1,
      menus: [],
      realName: '',
      roleId: 1,
      roleName: '',
      username: ''
    })
    const initRouteList = async () => {
      flatMenu.value.length = 0
      let menu: Menu[] = []
      // const m = await import('../json/menu.json')
      menu = config.source === 'local' ? _.cloneDeep(m) as Menu[] : userInfo.value?.menus
      for (const item of menu || []) {
        const tem = _.cloneDeep(item)
        tem.component = tem.component ? `../../../pages/${tem.component.split('/pages/')?.[1] || ''}` : ''
        flatMenu.value.push(tem)
      }
    }

    const getUserInfo = async () => {
      const menu = useMenuStore()
      // const res = await Http.get<UserInfo>('/api/manage/auth/userInfo', {})
      isLogin.value = true
      // userInfo.value = res as any
      await initRouteList()
      menu.initMenu()
    }

    return { isLogin, flatMenu, currentRoute, userInfo, baseLayerId, riverAndRoadLayerId, districtLayerId, exclude, initRouteList, getUserInfo }
  },
  {
    persist: {
      storage: window.sessionStorage
    }
  }
)
