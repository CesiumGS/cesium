// Inside the bucket we want to avoid calling the wrapped console.log
// which would create an infinite loop of postMessage and log calls

import { MessageToBucket } from "../Bucket";
import { ConsoleMessage } from "./ConsoleWrapper";

// @ts-expect-error We know this global may exist
const log = window.originalLog ?? console.log;

type ReactDevToolsMessage = {
  source: "react-devtools-bridge" | "react-devtools-content-script";
};

function isReactMessage(
  event: MessageEvent,
): event is MessageEvent<ReactDevToolsMessage> {
  return "source" in event.data && event.data.source.includes("react-devtools");
}

type MonacoMessage = { vscodeScheduleAsyncWork: number };

function isMonacoMessage(
  event: MessageEvent,
): event is MessageEvent<MonacoMessage> {
  return "vscodeScheduleAsyncWork" in event.data;
}

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
export type BridgeToApp = IframeBridge<MessageToApp, MessageToBucket>;
export type BridgeToBucket = IframeBridge<BridgeToBucket, MessageToApp>;

export class IframeBridge<
  SendMessageType = MessageWithType,
  RecieveMessageType = MessageWithType,
> {
  remoteOrigin: string;
  targetWindow: Window;
  #debugIdent?: string;
  #windowListener:
    | ((event: MessageEvent<RecieveMessageType>) => void)
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
    this.targetWindow.postMessage(message, this.remoteOrigin);
  }

  addEventListener(handler: (event: MessageEvent<RecieveMessageType>) => void) {
    this.#windowListener = (
      e:
        | MessageEvent<ReactDevToolsMessage>
        | MessageEvent<RecieveMessageType>
        | MessageEvent<MonacoMessage>,
    ) => {
      if (
        typeof e.data !== "object" ||
        isReactMessage(e) ||
        isMonacoMessage(e)
      ) {
        // TODO: consider flipping this to check for _our_ format only instead of excluding others
        // filter all of these, we don't care
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
