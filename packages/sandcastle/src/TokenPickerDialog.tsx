import { useEffect, useMemo, useState } from "react";
import { Button, IconButton, Text } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import {
  SandcastleDialog,
  SandcastleDialogFooter,
  SandcastleDialogHeading,
} from "./SandcastleDialog";
import { checkmark, copy, statusWarning } from "./icons";
import type { IonOAuthClient } from "./User/IonOAuthClient";
import { sleep } from "./util/sleep";
import "./TokenPickerDialog.css";

type TokenInfo = {
  id: string;
  name: string;
  scopes: string[];
  lastUsedLabel: string;
  assetAccessLabel: string;
  hasPrivateScopes: boolean;
  tokenValue?: string;
};

// Cesium ion scopes are documented here: https://cesium.com/learn/ion/rest-api/#section/Authentication

const publicScopes = new Set(["assets:limited-list", "assets:read", "geocode"]);

const privateScopes = new Set([
  "assets:list",
  "assets:source",
  "assets:write",
  "profile:read",
  "tokens:read",
  "tokens:write",
  "archives:read",
  "archives:write",
  "exports:read",
  "exports:write",
  "labels:read",
  "labels:write",
]);

type TokenPickerDialogProps = {
  open: boolean;
  ionClient?: IonOAuthClient;
  onClose: () => void;
  onConfirm: (token: string) => void;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function parseScopes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((scope): scope is string => typeof scope === "string");
  }
  if (typeof value === "string") {
    return value
      .split(/[\s,]+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }
  return [];
}

function hasAnyPrivateScope(scopes: string[]): boolean {
  return scopes.some(
    (scope) => privateScopes.has(scope) || !publicScopes.has(scope),
  );
}

function formatLastUsed(lastUsed?: string): string {
  if (!lastUsed) {
    return "Never";
  }

  const date = new Date(lastUsed);
  if (Number.isNaN(date.getTime())) {
    return lastUsed;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getTokenItems(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const record = asRecord(response);
  if (!record) {
    return [];
  }

  const candidates = [record.items, record.tokens, record.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function mapTokenInfo(rawToken: unknown, index: number): TokenInfo | undefined {
  const record = asRecord(rawToken);
  if (!record) {
    return undefined;
  }

  const id = getString(record, ["id"]) ?? `token-${index}`;
  const name = getString(record, ["name"]) ?? `Token ${index + 1}`;
  const scopes = parseScopes(record.scopes ?? record.scope);
  const hasPrivateScopes = hasAnyPrivateScope(scopes);
  const lastUsedRaw = getString(record, ["dateLastUsed"]);

  const assetsArray = Array.isArray(record.assetIds)
    ? record.assetIds
    : undefined;

  const assetAccessLabel =
    assetsArray === undefined ? "All" : String(assetsArray.length);

  const tokenValue = getString(record, ["token"]);

  return {
    id,
    name,
    scopes,
    lastUsedLabel: formatLastUsed(lastUsedRaw),
    assetAccessLabel,
    hasPrivateScopes,
    tokenValue,
  };
}

function extractTokenValue(payload: unknown): string | undefined {
  const record = asRecord(payload);
  if (!record) {
    return undefined;
  }

  return getString(record, ["token", "accessToken", "access_token"]);
}

export function TokenPickerDialog({
  open,
  ionClient,
  onClose,
  onConfirm,
}: TokenPickerDialogProps) {
  const [tokenOptions, setTokenOptions] = useState<TokenInfo[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [copiedTokenId, setCopiedTokenId] = useState<string | undefined>();
  const [copyingTokenId, setCopyingTokenId] = useState<string | undefined>();

  const selectedToken = useMemo(
    () => tokenOptions.find((token) => token.id === selectedTokenId),
    [tokenOptions, selectedTokenId],
  );

  const showRiskWarning = !!selectedToken && selectedToken.hasPrivateScopes;

  useEffect(() => {
    if (!open) {
      return;
    }

    let canceled = false;

    async function loadTokens() {
      if (!ionClient || !ionClient.loggedIn) {
        setTokenOptions([]);
        setError("Log in to select an access token.");
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const response = await ionClient.getTokens();
        if (canceled) {
          return;
        }

        const tokens = getTokenItems(response)
          .map((item, index) => mapTokenInfo(item, index))
          .filter((item): item is TokenInfo => !!item);

        setTokenOptions(tokens);
        setSelectedTokenId(tokens[0]?.id);
        if (tokens.length === 0) {
          setError("No tokens are available for this account.");
        }
      } catch (loadError) {
        if (!canceled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load tokens.",
          );
          setTokenOptions([]);
          setSelectedTokenId(undefined);
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    }

    loadTokens();

    return () => {
      canceled = true;
    };
  }, [open, ionClient]);

  async function handleConfirm() {
    if (!selectedToken || !ionClient) {
      return;
    }

    setIsUpdating(true);
    setError(undefined);

    try {
      let tokenValue = selectedToken.tokenValue;
      if (!tokenValue) {
        const details = await ionClient.getTokenById(selectedToken.id);
        tokenValue = extractTokenValue(details);
      }

      if (!tokenValue) {
        throw new Error(
          "Token value is unavailable for this selection. Choose a different token.",
        );
      }

      onConfirm(tokenValue);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to apply token.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function copyTokenValue(token: TokenInfo) {
    const tokenValue = token.tokenValue;
    if (!tokenValue) {
      return;
    }

    try {
      setCopiedTokenId(undefined);
      setCopyingTokenId(token.id);

      await navigator.clipboard.writeText(tokenValue);

      setCopyingTokenId(undefined);
      setCopiedTokenId(token.id);

      await sleep(1000);

      setCopiedTokenId((currentId) =>
        currentId === token.id ? undefined : currentId,
      );
    } catch (copyError) {
      setCopiedTokenId(undefined);
      setCopyingTokenId(undefined);

      if (copyError instanceof DOMException) {
        console.error(
          "Setting the clipboard is not allowed outside of a secure context",
        );
      } else {
        throw copyError;
      }
    }
  }

  return (
    <SandcastleDialog
      className="token-picker-dialog"
      open={open}
      onClose={onClose}
    >
      <SandcastleDialogHeading>Access Token</SandcastleDialogHeading>

      <Text variant="body-md">
        Select a token to insert or update in your current Sandcastle code.
      </Text>

      {isLoading && <Text variant="body-md">Loading tokens…</Text>}

      {!isLoading && tokenOptions.length > 0 && (
        <div
          className="token-picker-list"
          role="listbox"
          aria-label="Ion tokens"
        >
          {tokenOptions.map((token) => {
            const isSelected = token.id === selectedTokenId;
            const scopesLabel =
              token.scopes.length > 0 ? token.scopes.join(", ") : "None";
            const isTokenCopying = copyingTokenId === token.id;
            const isTokenCopied = copiedTokenId === token.id;

            return (
              <div key={token.id} className="token-picker-row-item">
                <button
                  type="button"
                  className={`token-picker-row${isSelected ? " selected" : ""}`}
                  onClick={() => setSelectedTokenId(token.id)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="token-picker-row-name">{token.name}</div>
                  <div className="token-picker-row-meta">
                    <span>Scopes: {scopesLabel}</span>
                    <span>Assets: {token.assetAccessLabel}</span>
                    <span>Last used: {token.lastUsedLabel}</span>
                  </div>
                </button>
                <IconButton
                  className="token-picker-copy"
                  icon={isTokenCopying || isTokenCopied ? checkmark : copy}
                  active={isTokenCopying || isTokenCopied}
                  label={`Copy ${token.name} token to clipboard`}
                  onClick={() => copyTokenValue(token)}
                  disabled={!token.tokenValue}
                />
              </div>
            );
          })}
        </div>
      )}

      {showRiskWarning && (
        <div className="token-picker-warning" role="note" aria-live="polite">
          <div className="token-picker-warning-header">
            <Icon href={statusWarning} />
            <span>This token may be risky to share.</span>
          </div>
          <p>
            The selected token includes private scopes which provide potentially
            sensitive information or otherwise allow changes to be made to your
            account. If you intend to share this sandcastle with others we
            recommend creating a token with only the public scopes:
            assets:limited-list, assets:read, and geocode.
          </p>
        </div>
      )}

      {error && (
        <Text variant="body-md" className="token-picker-error">
          {error}
        </Text>
      )}

      <SandcastleDialogFooter>
        <div className="token-picker-actions">
          <Button
            tone="accent"
            onClick={handleConfirm}
            disabled={!selectedToken || isUpdating || isLoading}
          >
            Update Token
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
        </div>
      </SandcastleDialogFooter>
    </SandcastleDialog>
  );
}
