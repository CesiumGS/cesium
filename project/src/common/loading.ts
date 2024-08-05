import { ElLoading } from 'element-plus'
import 'element-plus/es/components/loading/style/css'
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading'

interface LoadingItem {
  // target对应loading的技术
  count: number
  // loading实例
  instance: LoadingInstance
}

export default class Loading {

  // loading集合
  private static loadingMap: Map<string, LoadingItem> = new Map()

  /**
   *
   * 显示loading加载
   * @param target Loading 需要覆盖的 DOM 节点的选择器
   * @param text 显示在加载图标下方的加载文案
   * @return {() => void} loading的关闭函数
   */
  static show(target?: string, text?: string): () => void {
    target ??= 'body'
    // 获取target对应的loading实例
    let item = this.loadingMap.get(target)
    if (!item) {
      item = {
        count: 0,
        instance: ElLoading.service({
          target,
          fullscreen: false,
          lock: true,
          text: text ?? '加载中...',
          background: 'rgba(0, 0, 0, 0.3)'
        })
      }
      this.loadingMap.set(target, item)
    }
    item.count++

    return () => this.close(target!)
  }

  /**
   * 关闭loading加载<br>
   * **注意: 应当优先使用show方法返回的函数来关闭loading**
   * @param target Loading覆盖的 DOM 节点的选择器
   */
  static close(target: string) {
    if (!target) throw new Error('Close loading: The loading target is required!')
    // 获取target对应的loading实例
    const item = this.loadingMap.get(target)
    if (!item) return
    if (!--item.count) {
      // 计数-1后为0时则关闭loading
      item.instance.close()
      this.loadingMap.delete(target)
    }
  }

  // 清除loading
  static clear() {
    const list = this.loadingMap.values()
    for (const loadingItem of list) {
      loadingItem.instance.close()
    }
    this.loadingMap.clear()
  }
}
