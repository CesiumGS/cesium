import {
  Dialog,
  DialogDismiss,
  DialogHeading,
  DialogProps,
} from "@ariakit/react";
import classNames from "classnames";
import { ReactNode } from "react";
import "./SandcastleDialog.css";
import { Text } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import { close } from "./icons";

export function SandcastleDialogHeading({ children }: { children: ReactNode }) {
  return (
    <DialogHeading>
      <Text variant="headline-sm">{children}</Text>
    </DialogHeading>
  );
}

export function SandcastleDialogFooter({ children }: { children: ReactNode }) {
  return <div className="sc-dialog-footer">{children}</div>;
}

export function SandcastleDialog(
  props: {
    children: ReactNode;
    className?: string;
  } & DialogProps,
) {
  const { children, className, ...rest } = props;
  return (
    <Dialog {...rest} className={classNames("sc-dialog", className)}>
      {children}
      <DialogDismiss className="sc-dialog-close">
        <Icon href={close} />
      </DialogDismiss>
    </Dialog>
  );
}
