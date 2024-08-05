import { defineStore } from 'pinia'
import { ref } from 'vue'
// import localMenu from '../menu.json'
import { useUserStore } from './useUser'
import { useRouter } from 'vue-router'

export interface Menu {
  id: number | string
  path: string
  name: string
  icon: any
  show: boolean
  level: string
  parentId?: number | string
  default?: boolean
  disabled?: boolean
  component?: string
  children?: Menu[]
}

export function buildTree(arr: any[]) {
  const tree: any = []
  const map: any = {}

  arr.forEach(item => {
    const index = arr.findIndex((a: any) => a.id == item.parentId)
    map[item.id] = item
    if (item.parentId === undefined || index < 0) {
      tree.push(item)
    }
  })

  arr.forEach((item: any) => {
    // 多级菜单需要index 查找
    const index = arr.findIndex((a: any) => a.id == item.parentId)
    if (item.parentId !== undefined && index >= 0) {
      const parent = map[item.parentId]
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(item)
    }
  })
  return tree
}

const findParent = (item: Menu, level: string[], menu: Menu[] = [], active: string) => {
  if (!item.parentId) return
  let res: any = item
  let flag = true
  let fM: Menu | undefined = undefined
  const kIndex = level.indexOf(item.level) - 1
  const key = level[kIndex]
  while (flag) {
    const index = menu.findIndex((m: any) => res.parentId === m.id && (m.level === key || m.level === res.level))
    if (index < 0) flag = false
    else if (menu[index].id === active) {
      fM = menu[index]
      flag = false
    } else res = menu[index]
  }
  return fM
}

const findChild = (item: Menu, level: string[], menu: Menu[] = []) => {
  if (menu.length === 0 || level.length === 0) return
  let res: any = item
  let flag = true
  while (flag) {
    const index = menu.findIndex((m: Menu) => m.parentId === item.id && level.includes(m.level))
    if (index < 0) flag = false
    else if (menu[index].path) {
      res = menu[index]
      flag = false
    } else res = menu[index]
  }
  return res
}

const useMenuStore = defineStore('menuStore', () => {
  const userStore = useUserStore()
  const level = ref<string[]>(['level1', 'level2'])
  const menu = ref<any>({})
  const selected = ref<any>({})
  let activeCopy: { [name: string]: string }
  const active = ref<any>({})
  const isMenuSkip = ref(false)
  const tabs = ref<{ [name:string]: string }[]>([])

  for (const item of userStore?.flatMenu || []) if (item.children) item.children = []
  const menuTree = buildTree(JSON.parse(JSON.stringify(userStore.flatMenu)))
  const setDefault = (list: string[]) => {
    // 找寻父级菜单index
    const pIndex = (item: any) => userStore.flatMenu.findIndex((m: any) => m.level === item.level && item.id === m.parentId)
    for (const i in list) {
      const item = list[i]
      // 找寻上一级菜单index
      const kIndex = level.value.indexOf(item) - 1
      const key = level.value[kIndex]
      // 找寻下级选中菜单
      const index = userStore.flatMenu.findIndex(
        (m: any) =>
          m.level === item && pIndex(m) === -1 && (findParent(m, level.value, userStore.flatMenu, active.value[key]) || item === level.value[0])
      )
      active.value[item] = selected.value?.[key]?.[active.value?.[key]] || userStore.flatMenu[index]?.id
    }
  }

  // 记录每一级菜单选中值
  const setSelect = () => {
    for (const i in level.value) {
      const id = level.value[i]
      const key = level.value[parseInt(i) + 1]
      if (!selected.value[id])
        selected.value[id] = {
          [active.value[id]]: active.value[key]
        }
      else selected.value[id][active.value[id]] = active.value[key]
    }
  }

  // 路由变化切换菜单显示
  const setActive = (path: string) => {
    // 获取当前路由id
    const index = userStore.flatMenu.findIndex((menu: Menu) => menu.path === path)
    const um = userStore.flatMenu
    if (index > -1) {
      if (um[index].component) {
        const parent = []
        let ele = um[index]
        let flag = true
        // 找到所有父节点
        while (flag) {
          const parentIndex = um.findIndex((menu: Menu) => menu.id === ele.parentId)
          if (parentIndex >= 0) {
            parent.push(um[parentIndex])
            ele = um[parentIndex]
          } else flag = false
        }
        // 设置每一级激活菜单
        active.value[um[index].level] = um[index].id
        let level = um[index].level
        for (const item of parent) {
          if (level !== item.level) {
            active.value[item.level] = item.id
            level = item.level
          }
        }
      } else {
        // 输入父级域名，重定向到子路由
        const child: Menu = findChild(um[index], level.value, userStore.flatMenu)
        const router = useRouter()
        if (child.path) router.push(child.path)
      }
    }
    activeCopy = JSON.parse(JSON.stringify(active.value))
  }

  const menuChange = () => {
    if (!activeCopy) activeCopy = JSON.parse(JSON.stringify(active.value))
    else {
      for (const key in activeCopy) {
        if (activeCopy[key] !== active.value[key]) {
          const index = level.value.indexOf(key)
          setDefault(level.value.slice(index + 1))
        }
      }
      activeCopy = JSON.parse(JSON.stringify(active.value))
    }
    setSelect()
  }
  const initMenu = () => {
    for (const item of userStore.flatMenu) {
      item.id = `${item.id}`
      if (item.parentId !== undefined) item.parentId = `${item.parentId}`
    }
    // 缓存选择的菜单
    setDefault(level.value)
    activeCopy = JSON.parse(JSON.stringify(active.value))
    setSelect()

    const m: any = {}
    // 将菜单分类
    for (const item of userStore.flatMenu) {
      if (m[item.level]) m[item.level].push(item)
      else m[item.level] = [item]
    }
    // 每一类菜单组装
    for (const key in m) m[key] = buildTree(m[key])
    // 将菜单分组
    for (const l in level.value) {
      if (l !== '0') {
        const tem = m[level.value[l]] || []
        m[level.value[l]] = {}
        for (const item of tem) {
          if (m[level.value[l]][item.parentId]) m[level.value[l]][item.parentId].push(item)
          else m[level.value[l]][item.parentId] = [item]
        }
      }
    }
    menu.value = m
  }

  return {
    menu,
    active,
    selected,
    level,
    menuTree,
    isMenuSkip,
    tabs,
    menuChange,
    setActive,
    initMenu
  }
},{
  persist: {
    storage: window.sessionStorage
  }
})

export default useMenuStore
export { findParent, findChild }
