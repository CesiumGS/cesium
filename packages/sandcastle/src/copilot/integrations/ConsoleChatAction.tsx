import { Button } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { aiSparkle } from "../../icons";
import type { ConsoleMessage } from "../../ConsoleMirror";

export interface ConsoleChatActionProps {
  log: ConsoleMessage;
  index: number;
  onSend: (log: ConsoleMessage) => void;
}

export function ConsoleChatAction({
  log,
  index,
  onSend,
}: ConsoleChatActionProps) {
  if (log.type === "special" || log.message.trim().length === 0) {
    return null;
  }
  return (
    <Button
      variant="ghost"
      onClick={() => onSend(log)}
      aria-label={`Send console line ${index + 1} to chat`}
    >
      <Icon href={aiSparkle} />
      Send to chat
    </Button>
  );
}
