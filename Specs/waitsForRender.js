/*global define*/
define(['./render'], function(render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    function waitsForRender(context, frameState, primitive, func) {
        waitsFor(function() {
            return render(context, frameState, primitive) > 0;
        });

        runs(function() {
            func();
        });
    }

    return waitsForRender;
});