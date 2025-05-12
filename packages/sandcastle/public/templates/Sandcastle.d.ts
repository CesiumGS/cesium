/**
 * Helpers for constructing UI inside a Sandcastle and interacting with the code editor
 */
class Sandcastle {
  static bucket: string;
  static registered: {
    obj: object;
    lineNumber: number;
  }[];
  static reset: () => void;
  /**
   * Create a "bookmark" of sorts in the code that will be highlighted when run
   * @param obj
   */
  static declare(obj: any): void;
  /**
   * Highlight the given "bookmark" in the code
   * @param obj
   * @returns
   */
  static highlight(obj: any): void;
  static finishedLoading(): void;
  /**
   * Create a toggle button with a checkbox
   *
   * @param text Name on the button
   * @param checked Default checked state
   * @param onchange Event when the button in clicked
   * @param toolbarId Element to append this to, defaults to the default toolbar
   */
  static addToggleButton(
    text: string,
    checked: boolean,
    onchange: Function,
    toolbarId?: string,
  ): void;
  static addToolbarButton(
    text: string,
    onclick: Function,
    toolbarId?: string,
  ): void;
  static addDefaultToolbarButton(
    text: string,
    onclick: Function,
    toolbarId?: string,
  ): void;
  static addDefaultToolbarMenu(
    options: SelectOption[],
    toolbarId?: string,
  ): void;
  static addToolbarMenu(options: SelectOption[], toolbarId?: string): void;
}
type SelectOption = {
  text: string;
  value: string;
  onselect: Function;
};
export default Sandcastle;
