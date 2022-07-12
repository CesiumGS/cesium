/**
 * Flags to enable experimental features in CesiumJS. Stability and performance
 * may not be optimal when these are enabled. Experimental features are subject
 * to change without Cesium's standard deprecation policy.
 * <p>
 * Experimental features must still uphold Cesium's quality standards. Here
 * are some guidelines:
 * </p>
 * <ul>
 *   <li>Experimental features must have high unit test coverage like any other feature.</li>
 *   <li>Experimental features are intended for large features where there is benefit of merging some of the code sooner (e.g. to avoid long-running staging branches)</li>
 *   <li>Experimental flags should be short-lived. Make it clear in the PR what it would take to promote the feature to a regular feature.</li>
 *   <li>To avoid cluttering the code, check the flag in as few places as possible. Ideally this would be a single place.</li>
 * </ul>
 *
 * @namespace
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
const ExperimentalFeatures = {
  /**
   * Toggles the usage of the ModelExperimental class.
   *
   * @type {Boolean}
   */
  enableModelExperimental: true,
};

export default ExperimentalFeatures;
