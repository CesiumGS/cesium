/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 后端请求接口前缀
  readonly MT_API_URI: string
  // websocket链接地址
  readonly MT_WEBSOCKET_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'element-plus/dist/locale/zh-cn.js'
