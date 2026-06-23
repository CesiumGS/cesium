import { useState } from "react";
import { Button, IconButton } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { aiSparkle } from "../../icons";
import type { ConsoleMessage } from "../../ConsoleMirror";
import "./ConsoleChatAction.css";

interface ConsoleChatActionProps {
  log: ConsoleMessage;
  index: number;
  onSend: (log: ConsoleMessage) => void;
}

export function ConsoleChatAction({
  log,
  index,
  onSend,
}: ConsoleChatActionProps) {
  const [hovered, setHovered] = useState(false);

  if (log.type === "special" || log.message.trim().length === 0) {
    return null;
  }
  return (
    <div
      className="console-chat-action"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <IconButton
        variant="ghost"
        icon={aiSparkle}
        label={`Send console line ${index + 1} to chat`}
        onClick={() => onSend(log)}
      />
      {hovered && (
        <Button
          className="console-chat-action-expanded"
          onClick={() => onSend(log)}
          aria-label={`Send console line ${index + 1} to chat`}
        >
          <Icon href={aiSparkle} />
          Send to chat
        </Button>
      )}
    </div>
  );
}
