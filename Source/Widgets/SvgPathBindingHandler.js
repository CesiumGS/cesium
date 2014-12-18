/*global define*/
define(function() {
    "use strict";

    var svgNS = 'http://www.w3.org/2000/svg';
    var svgClassName = 'cesium-svgPath-svg';

    /**
     * A Knockout binding handler that creates a DOM element for a single SVG path.
     * This binding handler will be registered as cesiumSvgPath.
     *
     * <p>
     * The parameter to this binding is an object with the following properties:
     * </p>
     *
     * <ul>
     * <li>path: The SVG path as a string.</li>
     * <li>width: The width of the SVG path with no transformations applied.</li>
     * <li>height: The height of the SVG path with no transformations applied.</li>
     * <li>css: Optional. A string containing additional CSS classes to apply to the SVG. 'cesium-svgPath-svg' is always applied.</li>
     * </ul>
     *
     * @namespace
     * @alias SvgPathBindingHandler
     *
     * @example
     * // Create an SVG as a child of a div
     * <div data-bind="cesiumSvgPath: { path: 'M 100 100 L 300 100 L 200 300 z', width: 28, height: 28 }"></div>
     *
     * // parameters can be observable from the view model
     * <div data-bind="cesiumSvgPath: { path: currentPath, width: currentWidth, height: currentHeight }"></div>
     *
     * // or the whole object can be observable from the view model
     * <div data-bind="cesiumSvgPath: svgPathOptions"></div>
     */
    var SvgPathBindingHandler = {
        register : function(knockout) {
            knockout.bindingHandlers.cesiumSvgPath = {
                init : function(element, valueAccessor) {
                    var svg = document.createElementNS(svgNS, 'svg:svg');
                    svg.setAttribute('class', svgClassName);

                    var pathElement = document.createElementNS(svgNS, 'path');
                    svg.appendChild(pathElement);

                    knockout.virtualElements.setDomNodeChildren(element, [svg]);

                    knockout.computed({
                        read : function() {
                            var value = knockout.unwrap(valueAccessor());

                            pathElement.setAttribute('d', knockout.unwrap(value.path));

                            var pathWidth = knockout.unwrap(value.width);
                            var pathHeight = knockout.unwrap(value.height);

                            svg.setAttribute('width', pathWidth);
                            svg.setAttribute('height', pathHeight);
                            svg.setAttribute('viewBox', '0 0 ' + pathWidth + ' ' + pathHeight);

                            var fillRule = knockout.unwrap(value['fill-rule']);
                            if (fillRule) {
                                svg.setAttribute('fill-rule', fillRule);
                            }

                            if (value.css) {
                                svg.setAttribute('class', svgClassName + ' ' + knockout.unwrap(value.css));
                            }
                        },
                        disposeWhenNodeIsRemoved : element
                    });

                    return {
                        controlsDescendantBindings : true
                    };
                }
            };

            knockout.virtualElements.allowedBindings.cesiumSvgPath = true;
        }
    };

    return SvgPathBindingHandler;
});