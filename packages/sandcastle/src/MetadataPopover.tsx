import { Text } from "@stratakit/bricks";
import { SandcastlePopover } from "./SandcastlePopover";
import { memo } from "react";

export const MetadataPopover = memo(function MetadataPopover({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SandcastlePopover
      disclosure={
        <Text variant="body-md" className="metadata">
          {title}
        </Text>
      }
      title={title}
      description={
        !!description
          ? description
          : "This is a new sandcastle, make whatever you want!"
      }
    ></SandcastlePopover>
  );
});
