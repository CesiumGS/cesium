// The Viewer's warnings notice (widgets/warnings.ts; plan 5a's call 33) over
// a small fake DOM: built only at the first warning, dismissed until the
// next one, hidden by an empty list, commands shown as code, and Escape
// returning focus to the toggle only from inside the notice.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachWarnings } from "../widgets/warnings.ts";

type Listener = (event: {
  key?: string;
  target?: unknown;
  stopPropagation(): void;
}) => void;

class FakeText {
  parent?: FakeElement;
  constructor(readonly text: string) {}
  get textContent(): string {
    return this.text;
  }
}

class FakeElement {
  parent?: FakeElement;
  children: Array<FakeElement | FakeText> = [];
  className = "";
  id = "";
  hidden = false;
  title = "";
  type = "";
  innerHTML = "";
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, Listener[]>();
  constructor(readonly tagName: string) {}
  get textContent(): string {
    return this.children.map((c) => c.textContent).join("");
  }
  set textContent(text: string) {
    this.replaceChildren(new FakeText(text));
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((l) => l !== listener),
    );
  }
  dispatch(type: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ stopPropagation: () => {}, target: this, ...event });
    }
  }
  append(...nodes: Array<FakeElement | FakeText>): void {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes: Array<FakeElement | FakeText>): void {
    this.children = [];
    this.append(...nodes);
  }
  remove(): void {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((c) => c !== this);
      this.parent = undefined;
    }
  }
  contains(node: unknown): boolean {
    for (let n = node as FakeElement | undefined; n; n = n.parent) {
      if (n === this) {
        return true;
      }
    }
    return false;
  }
  focus(): void {
    fakeDocument.activeElement = this;
  }
  click(): void {
    this.dispatch("click");
  }
  /** Every element under this one with `className` among its classes. */
  find(className: string): FakeElement[] {
    const out: FakeElement[] = [];
    for (const child of this.children) {
      if (child instanceof FakeElement) {
        if (child.className.split(" ").includes(className)) {
          out.push(child);
        }
        out.push(...child.find(className));
      }
    }
    return out;
  }
  one(className: string): FakeElement {
    const [found] = this.find(className);
    if (!found) {
      throw new Error(`no .${className}`);
    }
    return found;
  }
}

const fakeDocument = {
  head: new FakeElement("head"),
  body: new FakeElement("body"),
  activeElement: undefined as FakeElement | undefined,
  root: new FakeElement("html"),
  createElement: (tag: string) => new FakeElement(tag),
  createTextNode: (text: string) => new FakeText(text),
  getElementById(id: string): FakeElement | undefined {
    const visit = (e: FakeElement): FakeElement | undefined =>
      e.id === id
        ? e
        : e.children
            .filter((c): c is FakeElement => c instanceof FakeElement)
            .map(visit)
            .find((x) => x);
    return visit(this.head) ?? visit(this.body);
  },
  listeners: new FakeElement("document"),
  addEventListener(type: string, listener: Listener): void {
    this.listeners.addEventListener(type, listener);
  },
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.removeEventListener(type, listener);
  },
};

let container: FakeElement;
beforeEach(() => {
  fakeDocument.head = new FakeElement("head");
  fakeDocument.body = new FakeElement("body");
  fakeDocument.listeners = new FakeElement("document");
  fakeDocument.activeElement = undefined;
  container = new FakeElement("div");
  fakeDocument.body.append(container);
  vi.stubGlobal("document", fakeDocument);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const notice = () => attachWarnings(container as unknown as HTMLElement);
const root = () => container.one("cesium-warnings");

describe("the warnings notice", () => {
  it("builds nothing until the first warning, then shows its summary", () => {
    const handle = notice();
    expect(container.children).toEqual([]);
    handle.set([]);
    expect(container.children).toEqual([]);
    handle.set([{ message: "the full story", summary: "In short" }]);
    expect(root().hidden).toBe(false);
    expect(root().one("cw-summary").textContent).toBe("In short");
    expect(root().one("cw-count").hidden).toBe(true);
    expect(root().one("cw-toggle").title).toBe("the full story");
    handle.dispose();
    expect(container.children).toEqual([]);
  });

  it("dismissed, it hides until a new warning arrives", () => {
    const handle = notice();
    const first = { message: "first" };
    handle.set([first]);
    root().one("cw-dismiss").click();
    expect(root().hidden).toBe(true);
    // The same list again: still dismissed.
    handle.set([first]);
    expect(root().hidden).toBe(true);
    handle.set([first, { message: "second" }]);
    expect(root().hidden).toBe(false);
    expect(root().one("cw-summary").textContent).toBe("second");
    expect(root().one("cw-count").textContent).toBe("2 warnings");
    expect(root().one("cw-live").textContent).toBe("Warning: second");
  });

  it("an empty list hides it and closes its panel", () => {
    const handle = notice();
    handle.set([{ message: "one" }]);
    root().one("cw-toggle").click();
    expect(root().one("cw-panel").hidden).toBe(false);
    handle.set([]);
    expect(root().hidden).toBe(true);
    expect(root().one("cw-panel").hidden).toBe(true);
    // A warning after it shows it again.
    handle.set([{ message: "two" }]);
    expect(root().hidden).toBe(false);
  });

  it("lists each warning with commands as code, never raw backticks", () => {
    const handle = notice();
    handle.set([
      {
        message: "the table ends; re-run `npm run setup` to refresh it",
        summary: "Out of date",
      },
      { message: "an unpaired ` stays text" },
    ]);
    const items = root().one("cw-list").children as FakeElement[];
    expect(items).toHaveLength(2);
    expect(items[0]!.one("cw-item-title").textContent).toBe("Out of date");
    const detail = items[0]!.one("cw-item-detail");
    expect(detail.textContent).toBe(
      "the table ends; re-run npm run setup to refresh it",
    );
    const code = detail.children.filter(
      (c): c is FakeElement => c instanceof FakeElement,
    );
    expect(code.map((c) => [c.tagName, c.textContent])).toEqual([
      ["code", "npm run setup"],
    ]);
    expect(items[1]!.one("cw-item-detail").textContent).toBe(
      "an unpaired  stays text",
    );
    expect(root().one("cw-toggle").title).not.toContain("`");
  });

  it("Escape closes the panel and refocuses the toggle only from inside", () => {
    const handle = notice();
    handle.set([{ message: "one" }]);
    const toggle = root().one("cw-toggle");
    const panel = root().one("cw-panel");
    // Focus elsewhere on the page: it stays there.
    const elsewhere = new FakeElement("input");
    fakeDocument.body.append(elsewhere);
    toggle.click();
    elsewhere.focus();
    fakeDocument.listeners.dispatch("keydown", { key: "Escape" });
    expect(panel.hidden).toBe(true);
    expect(fakeDocument.activeElement).toBe(elsewhere);
    // Focus in the notice: back to the toggle.
    toggle.click();
    root().one("cw-dismiss").focus();
    fakeDocument.listeners.dispatch("keydown", { key: "Escape" });
    expect(panel.hidden).toBe(true);
    expect(fakeDocument.activeElement).toBe(toggle);
  });
});
