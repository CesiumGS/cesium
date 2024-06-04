import knockout from "./ThirdParty/knockout.js";

/**
 * Subscribe to a Knockout observable ES5 property, and immediately fire
 * the callback with the current value of the property.
 *
 * @private
 *
 * @function subscribeAndEvaluate
 *
 * @param {object} owner The object containing the observable property.
 * @param {string} observablePropertyName The name of the observable property.
 * @param {Function} callback The callback function.
 * @param {object} [target] The value of this in the callback function.
 * @param {string} [event='change'] The name of the event to receive notification for.
 * @returns The subscription object from Knockout which can be used to dispose the subscription later.
 */
function subscribeAndEvaluate(
  owner,
  observablePropertyName,
  callback,
  target,
  event
) {
  callback.call(target, owner[observablePropertyName]);
  return knockout
    .getObservable(owner, observablePropertyName)
    .subscribe(callback, target, event);
}
export default subscribeAndEvaluate;
