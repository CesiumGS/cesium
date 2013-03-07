/*global define*/
define(['./SceneModeViewModel',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
        ], function(
            SceneModeViewModel,
            DeveloperError,
            knockout) {
    "use strict";

    var SceneModeWidget = function(container, transitioner) {
        var viewModel = new SceneModeViewModel(transitioner);
        this.viewModel = viewModel;

        var widgetNode = document.createElement('button');
        widgetNode.className = 'sceneModeCommon sceneModeWidget';
        widgetNode.setAttribute('data-bind', 'attr: { title: tooltip }, click: toggleDropdown');
        container.appendChild(widgetNode);
        knockout.applyBindings(viewModel, widgetNode);

        var node3D = document.createElement('button');
        node3D.className = 'sceneModeCommon sceneMode3D';
        node3D.setAttribute('data-bind', 'attr: { title: tooltip2D }, visible: dropDownVisible, click: morphTo3D');
        container.appendChild(node3D);
        knockout.applyBindings(viewModel, node3D);

        var node2D = document.createElement('button');
        node2D.className = 'sceneModeCommon sceneMode2D';
        node2D.setAttribute('data-bind', 'attr: { title: tooltip3D }, visible: dropDownVisible, click: morphTo2D');
        container.appendChild(node2D);
        knockout.applyBindings(viewModel, node2D);

        var nodeColumbus = document.createElement('button');
        nodeColumbus.className = 'sceneModeCommon sceneModeColumbusView';
        nodeColumbus.setAttribute('data-bind', 'attr: { title: tooltipColumbusView }, visible: dropDownVisible, click: morphToColumbusView');
        container.appendChild(nodeColumbus);
        knockout.applyBindings(viewModel, nodeColumbus);
    };

    return SceneModeWidget;
});