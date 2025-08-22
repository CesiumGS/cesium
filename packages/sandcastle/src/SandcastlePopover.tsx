import {
  Popover,
  PopoverArrow,
  PopoverDescription,
  PopoverDisclosure,
  PopoverHeading,
  PopoverProvider,
  usePopoverStore,
} from "@ariakit/react";
import "./SandcastlePopover.css";
import { ReactElement, ReactNode, useEffect } from "react";
import { Text } from "@stratakit/bricks";

export function SandcastlePopover({
  children,
  disclosure,
  disabled = false,
  title,
  description,
}: {
  /** Added to the popover after the title and description */
  children?: ReactNode;
  /** Element to act as the popover anchor and disclosure */
  disclosure: ReactElement;
  /** Disable this popover's disclosure */
  disabled?: boolean;
  /** Title added as a popover header for accessibility */
  title?: string;
  /** Description added as a popover description for accessibility */
  description?: string;
}) {
  const localStore = usePopoverStore();

  useEffect(() => {
    // By default "Ariakit doesn't close popups when the window loses focus,
    // as this is typically not what users expect"
    // However this means they don't close when clicking inside the viewer iframe
    // which feels wrong since we're still working with the same application.
    // Close on blur as suggested here: https://github.com/ariakit/ariakit/issues/3031
    function closePopoverOnBlur() {
      if (localStore.getState().open) {
        localStore.hide();
      }
    }
    window.addEventListener("blur", closePopoverOnBlur);
    return () => window.removeEventListener("blur", closePopoverOnBlur);
  }, [localStore]);

  return (
    <PopoverProvider store={localStore}>
      <PopoverDisclosure render={disclosure} disabled={disabled} />
      <Popover className="sc-popover">
        <PopoverArrow className="sc-popover-arrow" />
        {title && (
          <PopoverHeading render={<Text variant="body-lg">{title}</Text>} />
        )}
        {description && <PopoverDescription>{description}</PopoverDescription>}
        {children}
      </Popover>
    </PopoverProvider>
  );
}
