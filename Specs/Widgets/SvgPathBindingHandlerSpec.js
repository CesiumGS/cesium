/*global defineSuite*/
defineSuite([
        'Widgets/SvgPathBindingHandler',
        'ThirdParty/knockout'
    ], function(
        SvgPathBindingHandler,
        knockout) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('check binding with constants', function() {
        var div = document.createElement('div');
        div.setAttribute('data-bind', '\
cesiumSvgPath: { path: "M 100 100 L 300 100 L 200 300 Z", width: 28, height: 40, css: "someClass" }');

        document.body.appendChild(div);

        knockout.applyBindings({}, div);

        var svg = div.querySelector('svg.cesium-svgPath-svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('width')).toEqual('28');
        expect(svg.getAttribute('height')).toEqual('40');
        expect(svg.getAttribute('class').split(/\s/)).toContain('someClass');

        var path = div.querySelector('svg > path');
        expect(path).not.toBeNull();
        expect(path.getAttribute('d')).toEqual('M 100 100 L 300 100 L 200 300 Z');

        knockout.cleanNode(div);
        document.body.removeChild(div);
    });

    it('check binding with observables', function() {
        var div = document.createElement('div');
        div.setAttribute('data-bind', '\
cesiumSvgPath: { path: p, width: w, height: h, css: c }');

        document.body.appendChild(div);

        knockout.applyBindings({
            p : knockout.observable('M 100 100 L 300 100 L 200 300 Z'),
            w : knockout.observable(28),
            h : knockout.observable(40),
            c : knockout.observable('someClass')
        }, div);

        var svg = div.querySelector('svg.cesium-svgPath-svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('width')).toEqual('28');
        expect(svg.getAttribute('height')).toEqual('40');
        expect(svg.getAttribute('class').split(/\s/)).toContain('someClass');

        var path = div.querySelector('svg > path');
        expect(path).not.toBeNull();
        expect(path.getAttribute('d')).toEqual('M 100 100 L 300 100 L 200 300 Z');

        knockout.cleanNode(div);
        document.body.removeChild(div);
    });

    it('check binding with observable parameter object', function() {
        var div = document.createElement('div');
        div.setAttribute('data-bind', '\
cesiumSvgPath: svgPath');

        document.body.appendChild(div);

        var viewModel = {
            svgPath : knockout.observable({
                path : knockout.observable('M 100 100 L 300 100 L 200 300 Z'),
                width : knockout.observable(28),
                height : knockout.observable(40),
                css : knockout.observable('someClass')
            })
        };
        knockout.applyBindings(viewModel, div);

        var svg = div.querySelector('svg.cesium-svgPath-svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('width')).toEqual('28');
        expect(svg.getAttribute('height')).toEqual('40');
        expect(svg.getAttribute('class').split(/\s/)).toContain('someClass');

        var path = div.querySelector('svg > path');
        expect(path).not.toBeNull();
        expect(path.getAttribute('d')).toEqual('M 100 100 L 300 100 L 200 300 Z');

        knockout.cleanNode(div);
        document.body.removeChild(div);
    });
});