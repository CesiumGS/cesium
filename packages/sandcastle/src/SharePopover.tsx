import { Button, Field, IconButton, TextBox } from "@stratakit/bricks";
import { SandcastlePopover } from "./SandcastlePopover";
import { Icon } from "@stratakit/foundations";
import { checkmark, copy, share as shareIcon } from "./icons";
import { makeCompressedBase64String } from "./Helpers";
import { useEffect, useRef, useState, useTransition } from "react";
import { getBaseUrl } from "./util/getBaseUrl";

import "./SharePopover.css";

export function SharePopover({
  title,
  code,
  html,
}: {
  title?: string;
  code: string;
  html: string;
}) {
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

  const [wasCopied, setWasCopied] = useState(false);
  const [isCopied, startCopy] = useTransition();
  const copyShareUrl = () =>
    startCopy(async () => {
      try {
        setWasCopied(false);
        await navigator.clipboard.writeText(shareUrl);
        setWasCopied(true);
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
    });

  return (
    <SandcastlePopover
      className="share-popover"
      title={title ? `Share "${title}"` : "Share"}
      disclosure={
        <Button tone="accent" onClick={generateShareUrl}>
          <Icon href={shareIcon} /> Share
        </Button>
      }
    >
      <div className="input-row">
        <Field.Root>
          <Field.Control
            render={
              <TextBox.Textarea
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
                  setWasCopied(false);
                }}
                autoFocus
              ></TextBox.Textarea>
            }
          />
          <Field.Description>
            Copy this link to share the current Sandcastle. Be sure to re-share
            if you make any changes.
          </Field.Description>
        </Field.Root>
        <IconButton
          icon={wasCopied ? checkmark : copy}
          isActive={isCopied || wasCopied}
          label="Copy to clipboard"
          onClick={copyShareUrl}
        ></IconButton>
      </div>
    </SandcastlePopover>
  );
}
