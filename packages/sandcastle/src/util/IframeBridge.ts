import { type ConsoleMessage } from "./ConsoleWrapper";

// Inside the bucket we want to avoid calling the wrapped console.log
// which would create an infinite loop of postMessage and log calls
// @ts-expect-error We know this global may exist
const log = window.originalLog ?? console.log;

/**
 * Generic type to give some structure to the Bridge messages by default if not specified
 */
type MessageWithType = {
  type: string;
} & Record<string, unknown>;

export type MessageToApp =
  | { type: "bucketReady" }
  | ConsoleMessage
  | { type: "highlight"; highlight: number };
export type MessageToBucket =
  | { type: "reload" }
  | { type: "runCode"; code: string; html: string };
export type BridgeToApp = IframeBridge<MessageToApp, MessageToBucket>;
export type BridgeToBucket = IframeBridge<MessageToBucket, MessageToApp>;

type MessageAugment<T> = { id: "sandcastle-bridge"; message: T };
function isKnownMessageStructure<T>(
  event: MessageEvent,
): event is MessageEvent<MessageAugment<T>> {
  return event.data?.id === "sandcastle-bridge" && event.data?.message;
}

export class IframeBridge<
  SendMessageType = MessageWithType,
  RecieveMessageType = MessageWithType,
> {
  remoteOrigin: string;
  targetWindow: Window;
  #debugIdent?: string;
  #windowListener:
    | ((event: MessageEvent<MessageAugment<RecieveMessageType>>) => void)
    | undefined;

  constructor(
    remoteOrigin: string,
    targetWindow: Window,
    debugIdent = "Bridge",
  ) {
    this.remoteOrigin = remoteOrigin;
    this.targetWindow = targetWindow;
    this.#debugIdent = debugIdent;
  }

  sendMessage(message: SendMessageType) {
    if (window === this.targetWindow) {
      log(`xxx ${this.#debugIdent} not sending message to self`, message);
      // don't run when it's only this page open. It can crash the browser with an endless
      // loop of triggering our own message listener or just create "feedback" listening to our own messages
      return;
    }
    log(`<<< ${this.#debugIdent} sending message:`, message);
    this.targetWindow.postMessage(
      { id: "sandcastle-bridge", message: message },
      this.remoteOrigin,
    );
  }

  addEventListener(handler: (event: RecieveMessageType) => void) {
    this.#windowListener = (
      e: MessageEvent<MessageAugment<RecieveMessageType>> | MessageEvent,
    ) => {
      if (!isKnownMessageStructure<RecieveMessageType>(e)) {
        // completely ignore any message that doesn't have the structure we expect
        // For example react devtools messages or monaco editor alerts
        return;
      }

      if (e.origin !== this.remoteOrigin) {
        // ignore messages from origins we don't recognize
        log(
          `xxx ${this.#debugIdent} recieved message: ignoring bad origin - ${e.origin}`,
          e,
        );
        return;
      }
      if (window === e.source) {
        // ignore messages that come from the same window
        log(
          `xxx ${this.#debugIdent} recieved message: ignoring message from self`,
          e,
        );
        return;
      }

      log(`>>> ${this.#debugIdent} recieved message:`, e);

      handler(e.data.message);
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
