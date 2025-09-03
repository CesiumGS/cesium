import classNames from "classnames";
import "./ConsoleMirror.css";
import { useLayoutEffect, useRef } from "react";
import useStayScrolled from "react-stay-scrolled";
import { Badge } from "@stratakit/bricks";
import { caretDown, caretUp, statusError, statusWarning } from "./icons";
import { Icon } from "@stratakit/foundations";

export type ConsoleMessageType = "log" | "warn" | "error";
export type ConsoleMessage = {
  type: ConsoleMessageType;
  message: string;
  id: string;
};

export function ConsoleMirror({
  logs,
  expanded: consoleExpanded,
  toggleExpanded,
}: {
  logs: ConsoleMessage[];
  expanded: boolean;
  toggleExpanded: () => void;
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
      </div>
      <div className="logs" ref={logsRef}>
        {logs.length === 0 && (
          <div className="message info">
            <Icon />
            <pre>Any console messages will be mirrored here</pre>
          </div>
        )}
        {logs.map((log, i) => {
          let icon = "";
          if (log.type === "warn") {
            icon = statusWarning;
          } else if (log.type === "error") {
            icon = statusError;
          }
          return (
            <div
              key={i}
              className={classNames("message", {
                warning: log.type === "warn",
                error: log.type === "error",
              })}
            >
              <Icon href={icon} />
              <pre className="content">
                {i + 1}: {log.message}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
