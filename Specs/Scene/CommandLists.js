/*global defineSuite*/
defineSuite([
         'Scene/CommandLists',
         'Scene/Command'
     ], function(
         CommandLists,
         Command) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('empty', function() {
        var list = new CommandLists();
        expect(list.empty()).toEqual(true);

        list.colorList.push(new Command());
        expect(list.empty()).toEqual(false);
    });

    it('remove all', function() {
        var list = new CommandLists();
        expect(list.empty()).toEqual(true);

        list.colorList.push(new Command());
        expect(list.empty()).toEqual(false);

        list.removeAll();
        expect(list.empty()).toEqual(true);
    });
});