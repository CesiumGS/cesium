import { Check, defined } from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";
import I3SBuildingSceneLayerExplorerViewModel from "./I3SBuildingSceneLayerExplorerViewModel.js";

/**
 * I3S Building Scene Layer widget
 *
 * @alias I3SBuildingSceneLayerExplorer
 * @constructor
 *
 * @param {string} containerId The DOM element ID that will contain the widget.
 * @param {I3SDataProvider} i3sProvider I3S Data provider instance.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=I3S%20Building%20Scene%20Layer.html|I3S Building Scene Layer}
 */
function I3SBuildingSceneLayerExplorer(containerId, i3sProvider) {
  const container = document.getElementById(containerId);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("container", container);
  Check.defined("i3sProvider", i3sProvider);
  //>>includeEnd('debug');

  const htmlWrapper = document.createElement("div");
  htmlWrapper.innerHTML = `
        <h3>Building explorer</h3>
        <select
          data-bind="options: topLayers, optionsText: 'name', optionsAfterRender: setOptionDisable, value: currentLayer"
        ></select>
        <div id="bsl-wrapper">
          <h3>Select Level</h3>
          <select data-bind="options: levels, value: currentLevel"></select>
          <h3>Disciplines & Categories</h3>
          <ul class="layersList" data-bind="foreach: sublayers">
            <ul class="layersList" data-bind="foreach: sublayers.sort(function (l, r) { return l.name.localeCompare(r.name) })">
              <li>
                <div class="li-wrapper">
                  <span
                    class="expandItem"
                    data-bind="click: $root.expandClickHandler"
                    >+</span
                  >
                  <input
                    type="checkbox"
                    data-bind="checked: visibility, valueUpdate: 'input', attr: { id: name}"
                  />
                  <label data-bind="attr: { for: name}">
                    <span data-bind="text: name"></span>
                  </label>
                </div>
                <ul class="nested" data-bind="attr: { id: name + '-expander'}">
                  <li data-bind="foreach: sublayers.sort(function (l, r) { return l.name.localeCompare(r.name) })">
                    <div class="li-wrapper">
                      <input
                        type="checkbox"
                        data-bind="checked: visibility, valueUpdate: 'input', attr: { id: name}"
                      />
                      <label data-bind="attr: { for: name}">
                        <span data-bind="text: name"></span>
                      </label>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </ul>
        </div>`;
  container.appendChild(htmlWrapper);

  const viewModel = new I3SBuildingSceneLayerExplorerViewModel(i3sProvider);

  knockout.track(viewModel);
  knockout.applyBindings(viewModel, container);

  if (defined(viewModel.defaultLayer)) {
    // Select a model by default
    viewModel.currentLayer = viewModel.defaultLayer;
  }
}
export default I3SBuildingSceneLayerExplorer;
