import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import ConstantProperty from "./ConstantProperty.js";

function createProperty(
  name,
  privateName,
  subscriptionName,
  configurable,
  createPropertyCallback
) {
  return {
    configurable: configurable,
    get: function () {
      return this[privateName];
    },
    set: function (value) {
      var oldValue = this[privateName];
      var subscription = this[subscriptionName];
      if (defined(subscription)) {
        subscription();
        this[subscriptionName] = undefined;
      }

      var hasValue = value !== undefined;
      if (
        hasValue &&
        (!defined(value) || !defined(value.getValue)) &&
        defined(createPropertyCallback)
      ) {
        value = createPropertyCallback(value);
      }

      if (oldValue !== value) {
        this[privateName] = value;
        this._definitionChanged.raiseEvent(this, name, value, oldValue);
      }

      if (defined(value) && defined(value.definitionChanged)) {
        this[subscriptionName] = value.definitionChanged.addEventListener(
          function () {
            this._definitionChanged.raiseEvent(this, name, value, value);
          },
          this
        );
      }
    },
  };
}

function createConstantProperty(value) {
  return new ConstantProperty(value);
}

/**
 * Used to consistently define all DataSources graphics objects.
 * This is broken into two functions because the Chrome profiler does a better
 * job of optimizing lookups if it notices that the string is constant throughout the function.
 * @private
 */
function createPropertyDescriptor(name, configurable, createPropertyCallback) {
  //Safari 8.0.3 has a JavaScript bug that causes it to confuse two variables and treat them as the same.
  //The two extra toString calls work around the issue.
  return createProperty(
    name,
    "_" + name.toString(),
    "_" + name.toString() + "Subscription",
    defaultValue(configurable, false),
    defaultValue(createPropertyCallback, createConstantProperty)
  );
}
export default createPropertyDescriptor;
