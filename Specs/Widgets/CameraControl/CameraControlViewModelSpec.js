/*global defineSuite*/
defineSuite([
         'Widgets/CameraControl/CameraControlViewModel'
     ], function(
         CameraControlViewModel) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected values', function() {
        var viewModel = new CameraControlViewModel();
        expect(viewModel.tooltip).toBeDefined();
    });

    it('dropDownVisible and toggleDropDown work', function() {
        var viewModel = new CameraControlViewModel();

        expect(viewModel.dropDownVisible).toEqual(false);
        viewModel.toggleDropDown();
        expect(viewModel.dropDownVisible).toEqual(true);
        viewModel.dropDownVisible = false;
        expect(viewModel.dropDownVisible).toEqual(false);
    });
});