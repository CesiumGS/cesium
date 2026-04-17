import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import * as monaco from "monaco-editor";
import { DiffApplier } from "../ai/diff/DiffApplier";
import type { DiffBlock, InlineChange } from "../ai/types";
import { InlineChangeWidget } from "./InlineChangeWidget";

export interface InlineChangesApi {
  applyAiEdit: (code?: string, language?: "javascript" | "html") => void;
  queueInlineChange: (
    diff: DiffBlock,
    language: "javascript" | "html",
    startLine: number,
    endLine: number,
  ) => void;
  clearInlineChanges: () => void;
  getInlineChanges: () => InlineChange[];
  acceptInlineChange: (changeId: string) => void;
  rejectInlineChange: (changeId: string) => void;
}

export interface UseInlineChangesOptions {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  js: string;
  html: string;
  setJs: (code: string) => void;
  onHtmlChange: (
    code: string,
    event: monaco.editor.IModelContentChangedEvent,
  ) => void;
  activeTab: "js" | "html";
  setActiveTab: (tab: "js" | "html") => void;
}

export interface UseInlineChangesReturn {
  api: InlineChangesApi;
  widget: ReactElement;
  changes: InlineChange[];
}

export function useInlineChanges({
  editor,
  js,
  html,
  setJs,
  onHtmlChange,
  activeTab,
  setActiveTab,
}: UseInlineChangesOptions): UseInlineChangesReturn {
  const [inlineChanges, setInlineChanges] = useState<InlineChange[]>([]);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const decorationsRef = useRef<string[]>([]);

  const inlineChangesRef = useRef(inlineChanges);
  const currentChangeIndexRef = useRef(currentChangeIndex);
  const acceptChangeRef = useRef<(id: string) => void>(() => {});
  const rejectChangeRef = useRef<(id: string) => void>(() => {});

  useEffect(() => {
    inlineChangesRef.current = inlineChanges;
  }, [inlineChanges]);
  useEffect(() => {
    currentChangeIndexRef.current = currentChangeIndex;
  }, [currentChangeIndex]);

  useEffect(() => {
    if (!editor || inlineChanges.length === 0) {
      if (decorationsRef.current.length > 0) {
        decorationsRef.current =
          editor?.deltaDecorations(decorationsRef.current, []) || [];
      }
      return;
    }

    const relevantChanges = inlineChanges.filter(
      (change) =>
        (activeTab === "js" && change.language === "javascript") ||
        (activeTab === "html" && change.language === "html"),
    );

    const newDecorations: monaco.editor.IModelDeltaDecoration[] =
      relevantChanges.map((change) => ({
        range: new monaco.Range(change.startLine, 1, change.endLine, 1),
        options: {
          isWholeLine: true,
          className: "inline-change-decoration",
          glyphMarginClassName: "inline-change-decoration-glyph",
          linesDecorationsClassName: "inline-change-decoration-glyph",
        },
      }));

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
  }, [editor, inlineChanges, activeTab]);

  const queueInlineChange = useCallback(
    (
      diff: DiffBlock,
      language: "javascript" | "html",
      startLine: number,
      endLine: number,
    ) => {
      const newChange: InlineChange = {
        id: crypto.randomUUID(),
        diff,
        language,
        startLine,
        endLine,
        timestamp: Date.now(),
        source: "Copilot",
      };

      setInlineChanges((prev) => [...prev, newChange]);

      if (language === "javascript" && activeTab !== "js") {
        setActiveTab("js");
      } else if (language === "html" && activeTab !== "html") {
        setActiveTab("html");
      }
    },
    [activeTab, setActiveTab],
  );

  const acceptInlineChange = useCallback(
    (changeId: string) => {
      const change = inlineChanges.find((c) => c.id === changeId);
      if (!change) {
        return;
      }

      const applier = new DiffApplier();
      const sourceCode = change.language === "javascript" ? js : html;
      const result = applier.applyDiffs(sourceCode, [change.diff], {
        strict: false,
      });

      if (result.success && result.modifiedCode) {
        if (change.language === "javascript") {
          setJs(result.modifiedCode);
        } else {
          onHtmlChange(
            result.modifiedCode,
            {} as monaco.editor.IModelContentChangedEvent,
          );
        }
      }

      setInlineChanges((prev) => prev.filter((c) => c.id !== changeId));
      setCurrentChangeIndex((prevIndex) => {
        const newLength = inlineChanges.length - 1;
        if (newLength === 0) {
          return 0;
        }
        return Math.min(prevIndex, newLength - 1);
      });
    },
    [inlineChanges, js, html, setJs, onHtmlChange],
  );

  const rejectInlineChange = useCallback(
    (changeId: string) => {
      setInlineChanges((prev) => prev.filter((c) => c.id !== changeId));
      setCurrentChangeIndex((prevIndex) => {
        const newLength = inlineChanges.length - 1;
        if (newLength === 0) {
          return 0;
        }
        return Math.min(prevIndex, newLength - 1);
      });
    },
    [inlineChanges.length],
  );

  const clearInlineChanges = useCallback(() => {
    setInlineChanges([]);
    setCurrentChangeIndex(0);
  }, []);

  const applyAiEdit = useCallback(
    (code?: string, language?: "javascript" | "html") => {
      if (!code) {
        return;
      }
      if (language === "javascript") {
        setJs(code);
        setActiveTab("js");
      } else if (language === "html") {
        onHtmlChange(code, {} as monaco.editor.IModelContentChangedEvent);
        setActiveTab("html");
      }
    },
    [setJs, onHtmlChange, setActiveTab],
  );

  useEffect(() => {
    acceptChangeRef.current = acceptInlineChange;
    rejectChangeRef.current = rejectInlineChange;
  });

  const commandsRegisteredRef = useRef(false);
  useEffect(() => {
    if (!editor || commandsRegisteredRef.current) {
      return;
    }
    commandsRegisteredRef.current = true;

    monaco.editor.addCommand({
      id: "accept-inline-change",
      run: () => {
        const changes = inlineChangesRef.current;
        const idx = currentChangeIndexRef.current;
        if (changes.length > 0 && changes[idx]) {
          acceptChangeRef.current(changes[idx].id);
        }
      },
    });
    monaco.editor.addCommand({
      id: "reject-inline-change",
      run: () => {
        const changes = inlineChangesRef.current;
        const idx = currentChangeIndexRef.current;
        if (changes.length > 0 && changes[idx]) {
          rejectChangeRef.current(changes[idx].id);
        }
      },
    });

    const { KeyCode, KeyMod } = monaco;
    monaco.editor.addKeybindingRules([
      {
        keybinding: KeyMod.CtrlCmd | KeyCode.KeyY,
        command: "accept-inline-change",
      },
      {
        keybinding: KeyMod.CtrlCmd | KeyCode.KeyN,
        command: "reject-inline-change",
      },
    ]);
  }, [editor]);

  const currentTabChanges = useMemo(
    () =>
      inlineChanges.filter(
        (change) =>
          (activeTab === "js" && change.language === "javascript") ||
          (activeTab === "html" && change.language === "html"),
      ),
    [inlineChanges, activeTab],
  );

  const widget = (
    <InlineChangeWidget
      editor={editor}
      changes={currentTabChanges}
      currentChangeIndex={currentChangeIndex}
      onNavigate={setCurrentChangeIndex}
      onAccept={acceptInlineChange}
      onReject={rejectInlineChange}
    />
  );

  const getInlineChanges = useCallback(() => inlineChanges, [inlineChanges]);

  const api = useMemo<InlineChangesApi>(
    () => ({
      applyAiEdit,
      queueInlineChange,
      clearInlineChanges,
      getInlineChanges,
      acceptInlineChange,
      rejectInlineChange,
    }),
    [
      applyAiEdit,
      queueInlineChange,
      clearInlineChanges,
      getInlineChanges,
      acceptInlineChange,
      rejectInlineChange,
    ],
  );

  return {
    api,
    widget,
    changes: inlineChanges,
  };
}
