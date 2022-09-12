import { DeveloperError } from "@cesium/engine";

/**
 * If element is a string, look up the element in the DOM by ID.  Otherwise return element.
 *
 * @private
 *
 * @exception {DeveloperError} Element with id "id" does not exist in the document.
 */
function getElement(element) {
  if (typeof element === "string") {
    const foundElement = document.getElementById(element);

    //>>includeStart('debug', pragmas.debug);
    if (foundElement === null) {
      throw new DeveloperError(
        `Element with id "${element}" does not exist in the document.`
      );
    }
    //>>includeEnd('debug');

    element = foundElement;
  }
  return element;
}
export default getElement;
