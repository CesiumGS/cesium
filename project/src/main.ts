import { createApp } from 'vue'
import '@/assets/style/base.scss'

// pinia
import { createPinia } from 'pinia'
import piniaPluginPersistedState from 'pinia-plugin-persistedstate'

// icons 需要使用时取消注释
// import '@/assets/icons/icons.scss'
// import '@/assets/icons/icons'

import App from './App.vue'
import router from '@/components/layout/router'

import Loading from '@/common/loading'
import Message from '@/common/message'
import Http from '@/common/request'
import Socket from '@/common/socket'

import VxeTable from 'vxe-table'
import 'vxe-table/lib/style.css'
import VxeUI from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'

import '@/assets/iconfont/iconfont.css'
import '@/assets/iconfont/iconfont.js'

const app = createApp(App)
Object.defineProperties(window, {
  Loading: { value: Loading, writable: false },
  Message: { value: Message, writable: false },
  Http: { value: Http, writable: false },
  Socket: { value: Socket, writable: false }
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedState)
app.use(pinia)
app.use(router)
app.use(VxeTable)
app.use(VxeUI)

app.mount('#app')
