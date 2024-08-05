export default class Socket {
  // 消息处理器集合
  private static handlerMap = new Map<string, Function>()

  // websocket地址
  private static readonly URL = import.meta.env.MT_WEBSOCKET_URL

  // websocket实例
  private static socket: WebSocket | undefined

  // 初始化websocket连接
  static init() {
    const socket = new WebSocket(this.URL)
    socket.onopen = this.onOpen
    socket.onerror = this.onError
    socket.onclose = this.onClose
    socket.onmessage = this.onMessage
    this.socket = socket
  }

  private static onMessage(evt: MessageEvent) {
    console.log('socket收到消息: ', evt)
    // TODO 解析出消息类型,从消息处理器集合中找到对应消息处理器执行
  }

  private static onOpen(evt: Event) {
    console.log('socket连接成功')
  }

  private static onError(evt: Event) {
    console.log('socket连接失败')
  }

  private static onClose(evt: CloseEvent) {
    console.log('socket连接已关闭')
  }

  /**
   * 添加消息处理器
   * @param type 消息类型
   * @param handler 处理器函数
   * @param handlerKey 处理器唯一标识（当type相同时用于区分不同的处理器函数）
   */
  static addMessageHandler(type: string, handler: Function, handlerKey?: string) {
    const messageType = handlerKey ? `${type}#${handlerKey}` : type
    this.handlerMap.set(messageType, handler)
  }
  /**
   * 移除消息处理器
   * @param type 消息类型
   * @param handlerKey 处理器唯一标识
   */
  static removeMessageHandler(type: string, handlerKey?: string) {
    const messageType = handlerKey ? `${type}#${handlerKey}` : type
    this.handlerMap.delete(messageType)
  }
}
