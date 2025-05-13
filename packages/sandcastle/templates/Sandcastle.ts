// TODO: remove these and figure out the correct types
/* eslint-disable @typescript-eslint/no-explicit-any */

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

/**
 * Helpers for constructing UI inside a Sandcastle and interacting with the code editor
 */
class Sandcastle {
  static bucket = bucket;
  static registered = new Map<object, number>();
  // static registered: { obj: object; lineNumber: number }[] = new Map<object, number>();
  static reset = () => {};

  /**
   * Create a "bookmark" of sorts in the code that will be highlighted when run
   *
   * @param obj
   */
  static declare(obj: any) {
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
      let needle = `${Sandcastle.bucket}:`; // Firefox
      let pos = stack.indexOf(needle);
      if (pos < 0) {
        needle = " (<anonymous>:"; // Chrome
        pos = stack.indexOf(needle);
      }
      if (pos < 0) {
        needle = " (Unknown script code:"; // IE 11
        pos = stack.indexOf(needle);
      }
      if (pos >= 0) {
        pos += needle.length;
        const lineNumber = parseInt(stack.substring(pos), 10);
        Sandcastle.registered.set(obj, lineNumber);
      }
    } catch {}
  }

  /**
   * Highlight the given "bookmark" in the code
   * @param obj
   * @returns
   */
  static highlight(obj: any) {
    if (obj !== undefined) {
      const lineNumber =
        Sandcastle.registered.get(obj) ??
        Sandcastle.registered.get(obj.primitive);
      if (lineNumber !== undefined) {
        window.parent.postMessage({ highlight: lineNumber }, "*");
        return;
      }
    }

    window.parent.postMessage({ highlight: 0 }, "*");
  }

  /**
   * Signals to the page that Sandcastle has finished loading and calls the default
   * action if it has been set.
   * This is called automatically as part of the loading process, you should NOT need
   * to call this yourself.
   */
  static finishedLoading() {
    console.log("finishedLoading");

    Sandcastle.reset();

    if (defaultAction) {
      Sandcastle.highlight(defaultAction);
      defaultAction();
      defaultAction = undefined;
    }

    document.body.className = document.body.className.replace(
      /(?:\s|^)sandcastle-loading(?:\s|$)/,
      " ",
    );
  }
  /**
   * Create a toggle button with a checkbox
   *
   * @param text Button label
   * @param checked Default checked state
   * @param onchange Callback for when the button is clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  static addToggleButton(
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
    const label = document.createElement("label");
    label.appendChild(input);
    label.appendChild(document.createTextNode(text));
    label.style.pointerEvents = "none";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cesium-button";
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
  }

  /**
   * Create a button
   *
   * @param text Button label
   * @param onclick Callback for when the button is clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  static addToolbarButton(
    text: string,
    onclick: () => void,
    toolbarId?: string,
  ) {
    Sandcastle.declare(onclick);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cesium-button";
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
  }

  /**
   * Create a button and set the default action for this sandcastle to the click handler
   *
   * @param text Button label
   * @param onclick Callback for when the button is clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  static addDefaultToolbarButton(
    text: string,
    onclick: () => void,
    toolbarId?: string,
  ) {
    Sandcastle.addToolbarButton(text, onclick, toolbarId);
    defaultAction = onclick;
  }

  /**
   * Create a dropdown menu with the given options
   *
   * @param options Options in the select dropdown
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  static addToolbarMenu(options: SelectOption[], toolbarId?: string) {
    const menu = document.createElement("select");
    menu.className = "cesium-button";
    menu.onchange = function () {
      Sandcastle.reset();
      const item = options[menu.selectedIndex];
      if (item && typeof item.onselect === "function") {
        item.onselect();
      }
    };
    const toolbar = document.getElementById(toolbarId || "toolbar");
    if (!toolbar) {
      throw new Error(`Toolbar not found: ${toolbarId}`);
    }
    toolbar.appendChild(menu);

    if (!defaultAction && typeof options[0].onselect === "function") {
      defaultAction = options[0].onselect;
    }

    for (let i = 0, len = options.length; i < len; ++i) {
      const option = document.createElement("option");
      option.textContent = options[i].text;
      option.value = options[i].value;
      menu.appendChild(option);
    }
  }

  /**
   * Create a dropdown menu with the given options and set the default action for this
   * sandcastle to the first item's selection handler
   *
   * @param options Options in the select dropdown
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  static addDefaultToolbarMenu(options: SelectOption[], toolbarId?: string) {
    Sandcastle.addToolbarMenu(options, toolbarId);
    defaultAction = options[0].onselect;
  }
}

// window.Sandcastle = Sandcastle;
export default Sandcastle;
