import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'

// 消息类型
type MessageType = 'success' | 'warning' | 'info' | 'error'

export default class Message {
  /**
   * 显示消息提示
   * @param type 消息类型
   * @param message 消息雷内容
   */
  private static message(type: MessageType, message: string) {
    ElMessage({
      message,
      type,
      duration: 1500,
      showClose: true,
      grouping: true
    })
  }

  /**
   * 显示成功状态的消息提示
   * @param message 消息文字
   */
  static success(message: string) {
    this.message('success', message)
  }

  /**
   * 显示警告状态的消息提示
   * @param message 消息文字
   */
  static warning(message: string) {
    this.message('warning', message)
  }

  /**
   * 显示普通状态的消息提示
   * @param message 消息文字
   */
  static info(message: string) {
    this.message('info', message)
  }

  /**
   * 显示错误状态的消息提示
   * @param message 消息文字
   */
  static error(message: string) {
    this.message('error', message)
  }
}
