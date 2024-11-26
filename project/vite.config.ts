import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import proxy from './proxy.config'
// import { compression } from 'vite-plugin-compression2'
// import { pkgZip } from './build/pkg-zip'

// https://vitejs.dev/config/
export default defineConfig(config => ({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
    // compression()
    // pkgZip()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/',
  envDir: './env',
  envPrefix: 'MT_',
  server: {
    host: '0.0.0.0',
    open: false,
    proxy,
    fs: {
      allow: ['..']
    },
    watch: {
      ignored: [fileURLToPath(new URL('./src/components/layout/json/menu.json', import.meta.url))],
    }
  },
  build: {
    chunkSizeWarningLimit: 5120,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        compact: true,
        assetFileNames: '[ext]/[name]-[hash][extname]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        generatedCode: {
          constBindings: true,
          objectShorthand: true
        }
      }
    }
  },
  define: {
    CESIUM_BASE_URL: JSON.stringify('./Source')
  },
  esbuild: {
    // 构建时删除控制台输出语句
    drop: config.mode === 'production' ? ['console', 'debugger'] : []
  }
}))
