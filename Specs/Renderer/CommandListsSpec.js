/*global defineSuite*/
defineSuite([
         'Renderer/CommandLists',
         'Renderer/DrawCommand'
     ], function(
         CommandLists,
         DrawCommand) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('empty', function() {
        var list = new CommandLists();
        expect(list.empty()).toEqual(true);

        list.opaqueList.push(new DrawCommand());
        expect(list.empty()).toEqual(false);
    });

    it('remove all', function() {
        var list = new CommandLists();
        expect(list.empty()).toEqual(true);

        list.opaqueList.push(new DrawCommand());
        expect(list.empty()).toEqual(false);

        list.removeAll();
        expect(list.empty()).toEqual(true);
    });
});