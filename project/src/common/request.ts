// noinspection ExceptionCaughtLocallyJS

import router from '@/router'
import { saveAs } from 'file-saver'

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// loading选项
export interface LoadingOptions {
  // 是否显示loading
  loading?: boolean
  // loading需要覆盖的 DOM 节点的选择器
  target?: string
  // loading文字
  text?: string
}

// Http请求配置
export interface HttpOptions extends LoadingOptions {
  // 请求路径
  url?: string
  // 请求方法
  method?: RequestMethod
  // url参数
  params?: Record<string, string | number | boolean>
  // 请求体
  data?: FormData | Record<string, any> | Array<any>
  // 是否为下载请求
  isDownload?: boolean
  // 发生错误时的自定义显示消息
  errorMessage?: string
  // 请求成功后的自定义显示消息
  successMessage?: string
  // url统一前缀
  prefix?: boolean
}

// 分页
export interface Page {
  // 总页数
  total: number
  // 每页的大小
  pageSize: number
  // pageNum
  pageNum: number
}

// 响应结果中的数据
export interface Data<T> {
  // 数据对象
  obj: T
  // 数据列表
  list: T[]
  // 分页信息
  page: Page
}

// 响应结果
export interface Result<T> {
  // 状态码 0成功 非0失败
  code: number
  // 状态消息
  msg: string
  // 响应数据
  data: Data<T>
}

export default class Http {
  // 请求地址基础路径(需以斜杠/开头)
  private static apiUri = import.meta.env.MT_API_URI
  // 控制器对象列表
  private static controllers: Set<AbortController> = new Set()

  /**
   * 发起请求
   * @param options 请求配置
   * @private
   */
  private static async request<T>(options: HttpOptions): Promise<Data<T>> {
    let { url, loading } = options
    const { method, params, data, target, text, isDownload, errorMessage, successMessage, prefix=true } = options
    // url校验
    if (!url) throw new Error('The request url is required')
    if (!url.startsWith('/')) url = `/${url}`
    // 构建参数
    if (params) {
      const urlSearchParams = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        urlSearchParams.append(k, String(v))
      }
      const paramsString = urlSearchParams.toString()
      url += `${url.includes('?') ? '&' : '?'}${paramsString}`
    }

    // 构建请求体
    const headers = new Headers()
    if (document.cookie) {
      const authorization = /Authorization=([^;]+)/.exec(document.cookie)
      if (authorization && authorization[1]) {
        headers.append('Authorization', authorization[1])
      }
    }
    let body = undefined
    if (data) {
      if (data instanceof FormData) {
        body = data
      } else {
        body = JSON.stringify(data)
        headers.append('Content-Type', 'application/json')
      }
    }

    // 默认显示loading
    if (loading === undefined) loading = true

    // 控制器对象
    const controller = new AbortController()
    this.controllers.add(controller)

    // 加载loading
    let close
    loading && (close = Loading.show(target, text))
    if (prefix) url = `${this.apiUri}${url}`
    try {
      // 发起请求
      const resp = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal
      })
      if (!resp.ok) throw new Error(`${resp.status} - ${resp.statusText}`)

      // 当请求为下载数据时保存下载数据
      if (isDownload) {
        // 解析文件名称
        const disposition = resp.headers.get('content-disposition') || 'filename=document'
        const filename = /^.*filename=(.+)$/.exec(disposition)![1]
        // 下载数据
        const blob = await resp.blob()
        saveAs(blob, filename)
        return undefined as unknown as Data<T>
      }

      // 判断请求业务数据是否成功
      const result: Result<T> = await resp.json()
      // 未登录或登录超时
      if (result.code === 101) {
        // 跳转登录页
        await router.push('/login')
        throw new Error(`${result.msg}`)
      }
      // 0失败 1成功
      else if (result.code === 200) {
        successMessage && Message.success(successMessage)
        return result.data
      }
      throw new Error(errorMessage || result.msg)
    } catch (e: any) {
      // 对中止请求时产生的AbortError进行处理
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.warn('请求中止: ', url)
      } else {
        Message.error(e.message)
      }
      // 抛出错误以中止后续对响应数据的处理
      throw e
    } finally {
      loading && close && close()
      this.controllers.delete(controller)
    }
  }

  /**
   * GET请求
   * @param url 请求url
   * @param options 请求配置
   */
  static get<T>(url: string, options: HttpOptions) {
    return this.request<T>({ ...options, url, method: 'GET' })
  }

  /**
   * POST请求
   * @param url 请求url
   * @param options 请求配置
   */
  static post<T>(url: string, options: HttpOptions) {
    return this.request<T>({ ...options, url, method: 'POST' })
  }

  /**
   * PUT请求
   * @param url 请求url
   * @param options 请求配置
   */
  static put<T>(url: string, options: HttpOptions) {
    return this.request<T>({ ...options, url, method: 'PUT' })
  }

  /**
   * DELETE请求
   * @param url 请求url
   * @param options 请求配置
   */
  static delete<T>(url: string, options: HttpOptions) {
    return this.request<T>({ ...options, url, method: 'DELETE' })
  }

  /**
   * PATCH请求
   * @param url 请求url
   * @param options 请求配置
   */
  static patch<T>(url: string, options: HttpOptions) {
    return this.request<T>({ ...options, url, method: 'PATCH' })
  }

  // 中止所有请求
  static abortAll() {
    Loading.clear()
    this.controllers.forEach(controller => {
      controller.abort()
      this.controllers.delete(controller)
    })
  }
}
