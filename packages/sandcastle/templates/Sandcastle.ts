let defaultAction: (() => void) | undefined;
let bucket = window.location.href;
const pos = bucket.lastIndexOf("/");
if (pos > 0 && pos < bucket.length - 1) {
  bucket = bucket.substring(pos + 1);
}

type SelectOption = {
  text: string;
  value: string;
  onselect: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we don't care what the keys are
const registered = new Map<any, number>();

/**
 * Helpers for constructing UI inside a Sandcastle and interacting with the code editor
 */
const Sandcastle = {
  /**
   * Called on first load and every time the options set up by other helpers are changed.
   * No-op function by default, override with custom reset logic when needed
   */
  reset() {},

  /**
   * Create a "bookmark" of sorts in the code that will be highlighted when run
   *
   * @param key
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we don't care what the keys are
  declare(key: any) {
    /*eslint-disable no-empty*/
    try {
      //Browsers such as IE don't have a stack property until you actually throw the error.
      let stack = "";
      try {
        throw new Error();
      } catch (error) {
        if (error instanceof Error && error.stack !== undefined) {
          stack = error.stack.toString();
        }
      }
      let needle = `${bucket}:`; // Firefox
      let pos = stack.indexOf(needle);
      if (pos < 0) {
        needle = "<anonymous>:"; // Chrome
        pos = stack.indexOf(needle);
      }
      if (pos < 0) {
        needle = " (Unknown script code:"; // IE 11
        pos = stack.indexOf(needle);
      }
      if (pos >= 0) {
        pos += needle.length;
        const lineNumber = parseInt(stack.substring(pos), 10);
        registered.set(key, lineNumber);
      }
    } catch {}
  },

  /**
   * Highlight the given "bookmark" in the code
   *
   * @param key
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- we don't care what the keys are
  highlight(key: any) {
    if (key !== undefined) {
      const lineNumber = registered.get(key) ?? registered.get(key.primitive);
      if (lineNumber !== undefined) {
        window.parent.postMessage(
          { type: "highlight", highlight: lineNumber },
          "*",
        );
        return;
      }
    }

    window.parent.postMessage({ type: "highlight", highlight: 0 }, "*");
  },

  /**
   * Signals to the page that Sandcastle has finished loading and calls the default
   * action if it has been set.
   * This is called automatically as part of the loading process, you should NOT need
   * to call this yourself.
   */
  finishedLoading() {
    Sandcastle.reset();

    if (defaultAction) {
      Sandcastle.highlight(defaultAction);
      defaultAction();
      defaultAction = undefined;
    }

    document.body.classList.remove("sandcastle-loading");
  },

  /**
   * Create a toggle button with a checkbox
   *
   * @param text Button label
   * @param checked Default checked state
   * @param onchange Callback for when the button is clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  addToggleButton(
    text: string,
    checked: boolean,
    onchange: (newValue: boolean) => void,
    toolbarId?: string,
  ) {
    Sandcastle.declare(onchange);
    const input = document.createElement("input");
    input.checked = checked;
    input.type = "checkbox";
    input.style.pointerEvents = "none";
    input.className = "🥝-checkbox";
    const label = document.createElement("label");
    label.appendChild(document.createTextNode(text));
    label.style.pointerEvents = "none";
    label.className = "🥝-label";
    const button = document.createElement("div");
    // button.type = "button";
    button.className = "🥝-field";
    button.dataset.kiwiLabelPlacement = "after";
    button.dataset.kiwiControlType = "checkable";
    button.appendChild(input);
    button.appendChild(label);

    button.onclick = function () {
      Sandcastle.reset();
      Sandcastle.highlight(onchange);
      input.checked = !input.checked;
      onchange(input.checked);
    };

    const toolbar = document.getElementById(toolbarId || "toolbar");
    if (!toolbar) {
      throw new Error(`Toolbar not found: ${toolbarId}`);
    }
    toolbar.appendChild(button);
  },

  /**
   * Create a button
   *
   * @param text Button label
   * @param onclick Callback for when the button is clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  addToolbarButton(text: string, onclick: () => void, toolbarId?: string) {
    Sandcastle.declare(onclick);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "🥝-button";
    button.dataset.kiwiVariant = "solid";
    button.dataset.kiwiTone = "neutral";
    button.onclick = function () {
      Sandcastle.reset();
      Sandcastle.highlight(onclick);
      onclick();
    };
    button.textContent = text;
    const toolbar = document.getElementById(toolbarId || "toolbar");
    if (!toolbar) {
      throw new Error(`Toolbar not found: ${toolbarId}`);
    }
    toolbar.appendChild(button);
  },

  /**
   * Create a button and set the default action for this sandcastle to the click handler
   *
   * @param text Button label
   * @param onclick Callback for when the button is clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  addDefaultToolbarButton(
    text: string,
    onclick: () => void,
    toolbarId?: string,
  ) {
    Sandcastle.addToolbarButton(text, onclick, toolbarId);
    defaultAction = onclick;
  },

  /**
   * Create a dropdown menu with the given options
   *
   * @param options Options in the select dropdown
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  addToolbarMenu(options: SelectOption[], toolbarId?: string) {
    const menu = document.createElement("select");
    menu.className = "🥝-button 🥝-select";
    menu.dataset.kiwiVariant = "solid";
    menu.dataset.kiwiTone = "neutral";
    menu.onchange = function () {
      Sandcastle.reset();
      const item = options[menu.selectedIndex];
      if (item && typeof item.onselect === "function") {
        item.onselect();
      }
    };

    const wrapper = document.createElement("div");
    wrapper.className = "🥝-select-root";
    wrapper.appendChild(menu);

    // generate element direct from html string https://stackoverflow.com/a/35385518/7416863
    // TODO: this feels wrong but is necessary for the icon...
    const icon = document.createElement("template");
    icon.innerHTML = `<svg width="16" height="16" fill="none" viewBox="0 0 16 16" class="🥝-icon 🥝-disclosure-arrow 🥝-select-arrow" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M8 10 5 7h6l-3 3Z" clip-rule="evenodd"></path></svg>`;
    wrapper.appendChild(icon.content.firstChild!);

    const toolbar = document.getElementById(toolbarId || "toolbar");
    if (!toolbar) {
      throw new Error(`Toolbar not found: ${toolbarId}`);
    }
    toolbar.appendChild(wrapper);

    if (!defaultAction && typeof options[0].onselect === "function") {
      defaultAction = options[0].onselect;
    }

    for (let i = 0, len = options.length; i < len; ++i) {
      const option = document.createElement("option");
      option.textContent = options[i].text;
      option.value = options[i].value;
      menu.appendChild(option);
    }
  },

  /**
   * Create a dropdown menu with the given options and set the default action for this
   * sandcastle to the first item's selection handler
   *
   * @param options Options in the select dropdown
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  addDefaultToolbarMenu(options: SelectOption[], toolbarId?: string) {
    Sandcastle.addToolbarMenu(options, toolbarId);
    defaultAction = options[0].onselect;
  },
};

export default Sandcastle;
