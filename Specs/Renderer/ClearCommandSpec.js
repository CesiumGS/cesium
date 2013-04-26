/*global defineSuite*/
defineSuite([
         'Core/Color',
         'Renderer/ClearCommand'
     ], function(
         Color,
         ClearCommand) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs with defaults', function() {
        var c = new ClearCommand();
        expect(c.color).toBeUndefined();
        expect(c.depth).toBeUndefined();
        expect(c.stencil).toBeUndefined();
        expect(c.renderState).toBeUndefined();
        expect(c.framebuffer).toBeUndefined();
    });

    it('ClearCommand.ALL to have defaults', function() {
        expect(ClearCommand.ALL.color).toEqual(new Color(0.0, 0.0, 0.0, 0.0));
        expect(ClearCommand.ALL.depth).toEqual(1.0);
        expect(ClearCommand.ALL.stencil).toEqual(0.0);
        expect(ClearCommand.ALL.renderState).toBeUndefined();
        expect(ClearCommand.ALL.framebuffer).toBeUndefined();
    });
});