import { Dialog, DialogDismiss, DialogHeading } from "@ariakit/react";
import "./SettingsModal.css";
import { useContext } from "react";
import { SettingsContext } from "./SettingsContext";
import { Button } from "@stratakit/bricks";

export function SettingsModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { settings, updateSettings } = useContext(SettingsContext);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} className="dialog">
      <DialogHeading className="heading">Success</DialogHeading>
      <p className="description">
        Your payment has been successfully processed. We have emailed your
        receipt.
      </p>
      <p>Theme: {settings.theme}</p>
      <Button
        onClick={() => {
          if (settings.theme === "dark") {
            updateSettings({ theme: "light" });
          } else {
            updateSettings({ theme: "dark" });
          }
        }}
      >
        Change Theme
      </Button>
      <p>Font size: {settings.fontSize}</p>
      <Button
        onClick={() => {
          if (settings.fontSize === "large") {
            updateSettings({ fontSize: "small" });
          } else {
            updateSettings({ fontSize: "large" });
          }
        }}
      >
        Change Font Size
      </Button>
      <div>
        <DialogDismiss className="button">OK</DialogDismiss>
      </div>
    </Dialog>
  );
}
