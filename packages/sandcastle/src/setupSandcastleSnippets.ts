import { Monaco } from "@monaco-editor/react";
import { languages, Range } from "monaco-editor";

function createSandcastleSnippets(range: Range): languages.CompletionItem[] {
  // returning a static list of proposals, not even looking at the prefix (filtering is done by the Monaco editor)

  // the syntax for snippets with tab stops matches the implementation of VSCode,
  // read more here: https://code.visualstudio.com/docs/editing/userdefinedsnippets
  return [
    {
      label: "scbutton",
      kind: languages.CompletionItemKind.Function,
      documentation: "Create a Sandcastle button",
      insertText: `Sandcastle.addToolbarButton(\${1:"New Button"}, function () {
  \${0:// your code here}
});`,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range,
    },
    {
      label: "sctoggle",
      kind: languages.CompletionItemKind.Function,
      documentation: "Create a Sandcastle toggle button",
      insertText: `let \${2:toggleValue} = \${3:true};
Sandcastle.addToggleButton(\${1:"Toggle"}, \${2:toggleValue}, function (checked) {
  \${2:toggleValue} = checked;$0
});`,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range,
    },
    {
      label: "scmenu",
      kind: languages.CompletionItemKind.Function,
      documentation: "Create a Sandcastle select menu",
      insertText: `const \${1:options} = [
  {
    text: \${2:"Option 1"},
    onselect: function () {
      \${0:// your code here, the first option is always run at load}
    },
  },
];
Sandcastle.addToolbarMenu(\${1:options});`,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range,
    },
    {
      label: "scmenuitem",
      kind: languages.CompletionItemKind.Function,
      documentation: "Create a Sandcastle select menu item",
      insertText: `{
  text: \${1:"New Option"},
  onselect: function () {
    \${0:// your code here, the first option is always run at load}
  },
},`,
      insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range: range,
    },
  ];
}

// Largely based on the completion provider example:
// https://microsoft.github.io/monaco-editor/playground.html?source=v0.52.2#example-extending-language-services-completion-provider-example
export function setupSandcastleSnippets(monaco: Monaco) {
  monaco.languages.registerCompletionItemProvider("javascript", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      return {
        suggestions: createSandcastleSnippets(range),
      };
    },
  });
}
