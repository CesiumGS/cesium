import DeveloperError from "../Core/DeveloperError.js";

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

    ;

    element = foundElement;
  }
  return element;
}
export { getElement };
export default getElement;
