// import { Field, TextBox } from "@stratakit/bricks";
import { SandcastlePopover } from "./SandcastlePopover";
import { Icon } from "@stratakit/mui";
import { checkmark, copy, share as shareIcon } from "./icons";
import { makeCompressedBase64String } from "./Helpers";
import { useEffect, useRef, useState, useTransition } from "react";
import { getBaseUrl } from "./util/getBaseUrl";
// import { PopoverDescription } from "@ariakit/react";
import "./SharePopover.css";
import { sleep } from "./util/sleep";
import {
  Button,
  IconButton,
  // TextareaAutosize,
  TextField,
} from "@mui/material";

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

  const [wasCopied, setWasCopied] = useState(false);
  const [isCopying, startCopy] = useTransition();
  const copyShareUrl = () =>
    startCopy(async () => {
      try {
        setWasCopied(false);
        await navigator.clipboard.writeText(shareUrl);
        // need to wrap state updates after await in a new startTransition function
        // https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition
        startCopy(async () => {
          setWasCopied(true);
          await sleep(1000);
          startCopy(() => {
            setWasCopied(false);
          });
        });
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
      title="Share"
      disclosure={
        <Button
          color="primary"
          onClick={generateShareUrl}
          startIcon={<Icon href={shareIcon} />}
        >
          Share
        </Button>
      }
    >
      <div className="input-row">
        <div>
          {/* <Field.Root>
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
              <PopoverDescription>
                Copy this link to share the current Sandcastle. Be sure to
                re-share if you make any changes.
              </PopoverDescription>
            </Field.Description>
          </Field.Root> */}
          <TextField
            value={shareUrl}
            slotProps={{ input: { readOnly: true } }}
            multiline
            rows={1}
            helperText="Copy this link to share the current Sandcastle. Be sure to
                re-share if you make any changes."
            inputRef={(input: HTMLInputElement | null) => {
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
          />
        </div>
        <IconButton
          color={isCopying || wasCopied ? "success" : "default"}
          label="Copy to clipboard"
          onClick={copyShareUrl}
        >
          <Icon href={isCopying || wasCopied ? checkmark : copy} />
        </IconButton>
      </div>
    </SandcastlePopover>
  );
}
