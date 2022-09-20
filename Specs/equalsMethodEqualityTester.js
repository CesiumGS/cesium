import { defined } from "../packages/engine/index.js";

function equalsMethodEqualityTester(a, b) {
  let to_run;
  // if either a or b have an equals method, call it.
  if (a !== null && defined(a)) {
    if (typeof a.equals === "function") {
      return a.equals(b);
    } else if (a instanceof Object) {
      // Check if the current object has a static function named 'equals'
      to_run = Object.getPrototypeOf(a).constructor.equals;
      if (typeof to_run === "function") {
        return to_run(a, b);
      }
    }
  }

  if (b !== null && defined(b)) {
    if (typeof b.equals === "function") {
      return b.equals(a);
    } else if (b instanceof Object) {
      // Check if the current object has a static function named 'equals'
      to_run = Object.getPrototypeOf(b).constructor.equals;
      if (typeof to_run === "function") {
        return to_run(b, a);
      }
    }
  }

  // fall back to default equality checks.
  return undefined;
}
export default equalsMethodEqualityTester;
