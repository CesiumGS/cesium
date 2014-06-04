/*global defineSuite*/
defineSuite([
        'Scene/FrustumCommands'
    ], function(
        FrustumCommands) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs without arguments', function() {
        var frustum = new FrustumCommands();
        expect(frustum.near).toEqual(0.0);
        expect(frustum.far).toEqual(0.0);
        expect(frustum.opaqueCommands).toBeDefined();
        expect(frustum.opaqueCommands.length).toEqual(0);
        expect(frustum.translucentCommands).toBeDefined();
        expect(frustum.translucentCommands.length).toEqual(0);
    });

    it('constructs with arguments', function() {
        var near = 1.0;
        var far = 2.0;
        var frustum = new FrustumCommands(near, far);
        expect(frustum.near).toEqual(near);
        expect(frustum.far).toEqual(far);
        expect(frustum.opaqueCommands).toBeDefined();
        expect(frustum.opaqueCommands.length).toEqual(0);
        expect(frustum.translucentCommands).toBeDefined();
        expect(frustum.translucentCommands.length).toEqual(0);
    });
});