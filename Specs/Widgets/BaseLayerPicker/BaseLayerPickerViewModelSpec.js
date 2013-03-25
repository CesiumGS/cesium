/*global defineSuite*/
defineSuite(['Widgets/BaseLayerPicker/BaseLayerPickerViewModel',
             'Scene/ImageryLayerCollection'
            ], function(
              BaseLayerPickerViewModel,
              ImageryLayerCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can create and destroy', function() {
        var viewModel = new BaseLayerPickerViewModel(new ImageryLayerCollection());
    });

    it('constructor throws with no layer collection', function() {
        expect(function() {
            return new BaseLayerPickerViewModel(undefined);
        }).toThrow();
    });
});