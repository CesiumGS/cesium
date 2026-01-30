import classNames from "classnames";
import "./ConsoleMirror.css";
import { useLayoutEffect, useRef } from "react";
import useStayScrolled from "react-stay-scrolled";
import { Badge, Button } from "@stratakit/bricks";
import {
  caretDown,
  caretUp,
  deleteIcon,
  statusError,
  statusWarning,
} from "./icons";
import { Icon } from "@stratakit/foundations";

export type ConsoleMessageType = "log" | "warn" | "error" | "special";
export type ConsoleMessage = {
  type: ConsoleMessageType;
  message: string;
  id: string;
};

function ConsoleIcon({ type }: { type: ConsoleMessageType }) {
  if (type === "error") {
    return <Icon href={statusError} />;
  }
  if (type === "warn") {
    return <Icon href={statusWarning} />;
  }
  return <div className="no-icon"></div>;
}

export function ConsoleMirror({
  logs,
  expanded: consoleExpanded,
  toggleExpanded,
  resetConsole,
}: {
  logs: ConsoleMessage[];
  expanded: boolean;
  toggleExpanded: () => void;
  resetConsole: (options?: { showMessage?: boolean }) => void;
}) {
  const logsRef = useRef<HTMLDivElement>(document.createElement("div"));
  // TODO: determine if we need this lib or can implement ourselves. It's a little outdated
  const { stayScrolled } = useStayScrolled(logsRef);

  useLayoutEffect(() => {
    stayScrolled();
  }, [stayScrolled, logs.length]);

  const normalLogs = logs.filter((log) => log.type === "log");
  const warnings = logs.filter((log) => log.type === "warn");
  const errors = logs.filter((log) => log.type === "error");

  return (
    <div
      className={classNames("console-mirror", {
        expanded: consoleExpanded,
      })}
    >
      <div className="console-snapshot" onClick={toggleExpanded}>
        <Icon href={consoleExpanded ? caretDown : caretUp} />
        <span onClick={toggleExpanded} className="title">
          Console
        </span>
        {normalLogs.length > 0 && (
          <Badge label={normalLogs.length} variant="muted" />
        )}
        {warnings.length > 0 && (
          <Badge label={warnings.length} tone="attention" variant="muted" />
        )}
        {errors.length > 0 && (
          <Badge label={errors.length} tone="critical" variant="muted" />
        )}
        <div className="spacer"></div>
        <Button
          className="clear-button"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            resetConsole({ showMessage: true });
          }}
        >
          <Icon href={deleteIcon} />
          Clear console
        </Button>
      </div>
      <div className="logs" ref={logsRef}>
        {logs.length === 0 && (
          <div className="message info">
            <Icon />
            <pre>Any console messages will be mirrored here</pre>
          </div>
        )}
        {logs.map((log, i) => {
          return (
            <div
              key={i}
              className={classNames("message", {
                warning: log.type === "warn",
                error: log.type === "error",
                special: log.type === "special",
              })}
            >
              <ConsoleIcon type={log.type} />
              <span className="message-index">{i + 1}:</span>
              <pre className="content">{log.message}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
