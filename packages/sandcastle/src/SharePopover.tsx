import { Button, IconButton, TextBox } from "@stratakit/bricks";
import { SandcastlePopover } from "./SandcastlePopover";
import { Icon } from "@stratakit/foundations";
import { copy, share as shareIcon } from "./icons";
import { makeCompressedBase64String } from "./Helpers";
import { useEffect, useRef, useState } from "react";
import { getBaseUrl } from "./util/getBaseUrl";

import "./SharePopover.css";

export function SharePopover({ code, html }: { code: string; html: string }) {
  const latestCode = useRef("");
  const latestHtml = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Intentionally run "cheap" update on every re-render,
    // these values are expected to change often, no need to generate the URL every time
    // "Latest ref pattern": https://tkdodo.eu/blog/the-useless-use-callback#the-latest-ref-pattern
    latestCode.current = code;
    latestHtml.current = html;
  });

  const [shareUrl, setShareUrl] = useState("");
  function generateShareUrl() {
    const base64String = makeCompressedBase64String({
      code: latestCode.current,
      html: latestHtml.current,
    });

    const newShareUrl = `${getBaseUrl()}#c=${base64String}`;
    setShareUrl(newShareUrl);
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      if (error instanceof DOMException) {
        // Note localhost should always work regardless of https
        // https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts#potentially_trustworthy_origins
        console.error(
          "Setting the clipboard is not allowed outside of a secure context",
        );
      } else {
        throw error;
      }
    }
    inputRef.current?.focus();
  }

  return (
    <SandcastlePopover
      disclosure={
        <Button tone="accent" onClick={generateShareUrl}>
          <Icon href={shareIcon} /> Share
        </Button>
      }
      description="Copy this URL to share your current Sandcastle. Be sure to re-share if you make any changes."
    >
      <div className="input-row">
        <TextBox.Input
          value={shareUrl}
          readOnly
          ref={(input: HTMLInputElement | null) => {
            inputRef.current = input;
            if (input) {
              // we "force" selection here to make sure the actual HTML has rendered
              input.select();
            }
          }}
          onFocus={(e) => {
            e.target.select();
          }}
          autoFocus
        ></TextBox.Input>
        <IconButton
          icon={copy}
          label="Copy to clipboard"
          onClick={copyShareUrl}
        ></IconButton>
      </div>
    </SandcastlePopover>
  );
}
