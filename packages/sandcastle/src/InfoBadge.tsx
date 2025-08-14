import { Icon } from "@stratakit/foundations";
import { info } from "./icons";
import { Tooltip } from "@stratakit/bricks";
import { TooltipProviderProps } from "@ariakit/react";
import "./InfoBadge.css";

export default function InfoBadge({
  content,
  placement = "top",
}: {
  content: string;
  placement?: TooltipProviderProps["placement"];
}) {
  return (
    <Tooltip content={content} placement={placement}>
      <div className="info-badge">
        <Icon href={info} />
      </div>
    </Tooltip>
  );
}
