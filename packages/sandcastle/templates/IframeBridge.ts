import { originalLog } from "./ConsoleWrapper";

export class IframeBridge {
  remoteOrigin: string;
  targetWindow: Window;
  #windowListener: ((event: MessageEvent) => void) | undefined;

  constructor(remoteOrigin: string, targetWindow: Window) {
    this.remoteOrigin = remoteOrigin;
    this.targetWindow = targetWindow;
  }

  sendMessage(message: unknown) {
    if (window === this.targetWindow) {
      originalLog("Bucket not sending message to self", message);
      // don't run when it's only this page open. It can crash the browser with an endless
      // loop of triggering our own message listener or just create "feedback" listening to our own messages
      return;
    }
    originalLog("Bucket sending message:", message);
    this.targetWindow.postMessage(message, this.remoteOrigin);
  }

  addEventListener(handler: (event: MessageEvent) => void) {
    this.#windowListener = (e) => {
      if (e.origin !== this.remoteOrigin) {
        originalLog(`Bucket message: ignoring bad origin - ${e.origin}`);
        // ignore messages from origins we don't recognize
        return;
      }
      if (e.data?.source?.includes("react-devtools")) {
        // filter all of these, we don't care
        return;
      }

      handler(e);
    };
    window.addEventListener("message", this.#windowListener);
    return this.#windowListener;
  }

  removeEventListener() {
    if (this.#windowListener) {
      window.removeEventListener("message", this.#windowListener);
    }
  }
}
