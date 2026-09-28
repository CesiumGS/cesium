import { deprecationWarning } from "@cesium/core";

/**
 * Wraps a symbol moved to @cesium/core in a Proxy that logs a one-time
 * deprecation warning the first time it's constructed, called, read, or
 * written to, then forwards to the real implementation.
 * @param {string} name The exported symbol's name, e.g. "Cartesian3".
 * @param {*} target The real @cesium/core export being wrapped.
 * @returns {*}
 * @ignore
 */
function deprecatedCoreExport(name, target) {
  const message = `${name} has been moved from cesium/engine to cesium/core in CesiumJS 1.146, and will be removed from cesium/engine in 1.150. Import from cesium/core instead.`;
  const warn = () => deprecationWarning(name, message);

  return new Proxy(target, {
    get(t, prop, receiver) {
      warn();
      return Reflect.get(t, prop, receiver);
    },
    set(t, prop, value, receiver) {
      warn();
      return Reflect.set(t, prop, value, receiver);
    },
    apply(t, thisArg, args) {
      warn();
      return Reflect.apply(t, thisArg, args);
    },
    construct(t, args, newTarget) {
      warn();
      return Reflect.construct(t, args, newTarget);
    },
  });
}
export default deprecatedCoreExport;
