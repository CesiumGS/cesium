import type { HttpOptions, Data } from '@/common/request'

declare global {
  const Loading: {
    /**
     * 显示loading加载
     * @param target Loading 需要覆盖的 DOM 节点的选择器
     * @param text 显示在加载图标下方的加载文案
     * @return {() => void} loading的关闭函数
     */
    show(target?: string, text?: string): () => void

    /**
     * 关闭loading加载<br>
     * **注意: 应当优先使用show方法返回的函数来关闭loading**
     * @param target Loading覆盖的 DOM 节点的选择器
     */
    close(target: string)

    // 清除loading
    clear()
  }

  const Message: {
    /**
     * 显示成功状态的消息提示
     * @param message 消息文字
     */
    success(message: string)

    /**
     * 显示警告状态的消息提示
     * @param message 消息文字
     */
    warning(message: string)

    /**
     * 显示普通状态的消息提示
     * @param message 消息文字
     */
    info(message: string)

    /**
     * 显示错误状态的消息提示
     * @param message 消息文字
     */
    error(message: string)
  }

  const Http: {
    /**
     * GET请求
     * @param url 请求url
     * @param options 请求配置
     */
    get<T>(url: string, options?: HttpOptions): Promise<Data<T>>

    /**
     * POST请求
     * @param url 请求url
     * @param options 请求配置
     */
    post<T>(url: string, options?: HttpOptions): Promise<Data<T>>

    /**
     * PUT请求
     * @param url 请求url
     * @param options 请求配置
     */
    put<T>(url: string, options?: HttpOptions): Promise<Data<T>>

    /**
     * DELETE请求
     * @param url 请求url
     * @param options 请求配置
     */
    delete<T>(url: string, options?: HttpOptions): Promise<Data<T>>

    /**
     * PATCH请求
     * @param url 请求url
     * @param options 请求配置
     */
    patch<T>(url: string, options?: HttpOptions): Promise<Data<T>>

    // 中止所有请求
    abortAll()
  }

  const Socket: {
    /**
     * 初始化websocket连接
     */
    init()

    /**
     * 添加消息处理器
     * @param type 消息类型
     * @param handler 处理器函数
     * @param handlerKey 处理器唯一标识（当type相同时用于区分不同的处理器函数）
     */
    addMessageHandler(type: string, handler: Function, handlerKey?: string)

    /**
     * 移除消息处理器
     * @param type 消息类型
     * @param handlerKey 处理器唯一标识
     */
    removeMessageHandler(type: string, handlerKey?: string)
  }
}

// required!!
export {}
