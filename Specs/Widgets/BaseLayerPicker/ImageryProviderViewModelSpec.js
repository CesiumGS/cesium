/*global defineSuite*/
defineSuite([
         'Widgets/BaseLayerPicker/ImageryProviderViewModel',
         'Widgets/createCommand',
         'ThirdParty/knockout'
     ], function(
         ImageryProviderViewModel,
         createCommand,
         knockout) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var spyCreationFunction;
    beforeEach(function() {
        spyCreationFunction = jasmine.createSpy('creationFunction');
    });

    describe('with observables', function() {
        it('constructor sets expected parameters', function() {
            var description = {
                name : knockout.observable('name'),
                tooltip : knockout.observable('tooltip'),
                iconUrl : knockout.observable('iconUrl'),
                creationFunction : createCommand(spyCreationFunction)
            };

            var viewModel = new ImageryProviderViewModel(description);
            expect(viewModel.name).toBe(description.name());
            expect(viewModel.tooltip).toBe(description.tooltip());
            expect(viewModel.iconUrl).toBe(description.iconUrl());

            expect(viewModel.creationCommand).toBeDefined();
            viewModel.creationCommand();
            expect(spyCreationFunction).toHaveBeenCalled();
        });

        it('constructor throws with no name', function() {
            var description = {
                tooltip : knockout.observable('tooltip'),
                iconUrl : knockout.observable('iconUrl'),
                creationFunction : createCommand(spyCreationFunction)
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });

        it('constructor throws with no tooltip', function() {
            var description = {
                name : knockout.observable('name'),
                iconUrl : knockout.observable('iconUrl'),
                creationFunction : createCommand(spyCreationFunction)
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });

        it('constructor throws with no iconUrl', function() {
            var description = {
                name : knockout.observable('name'),
                tooltip : knockout.observable('tooltip'),
                creationFunction : createCommand(spyCreationFunction)
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });

        it('constructor throws with no creationFunction', function() {
            var description = {
                name : knockout.observable('name'),
                tooltip : knockout.observable('tooltip'),
                iconUrl : knockout.observable('iconUrl')
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });
    });

    describe('with values', function() {
        it('constructor sets expected parameters', function() {
            var description = {
                name : 'name',
                tooltip : 'tooltip',
                iconUrl : 'iconUrl',
                creationFunction : spyCreationFunction
            };

            var viewModel = new ImageryProviderViewModel(description);
            expect(viewModel.name).toEqual(description.name);
            expect(viewModel.tooltip).toEqual(description.tooltip);
            expect(viewModel.iconUrl).toEqual(description.iconUrl);

            expect(viewModel.creationCommand).toBeDefined();
            viewModel.creationCommand();
            expect(spyCreationFunction).toHaveBeenCalled();
        });

        it('constructor throws with no name', function() {
            var description = {
                tooltip : 'tooltip',
                iconUrl : 'iconUrl',
                creationFunction : spyCreationFunction
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });

        it('constructor throws with no tooltip', function() {
            var description = {
                name : 'name',
                iconUrl : 'iconUrl',
                creationFunction : spyCreationFunction
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });

        it('constructor throws with no iconUrl', function() {
            var description = {
                name : 'name',
                tooltip : 'tooltip',
                creationFunction : spyCreationFunction
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });

        it('constructor throws with no creationFunction', function() {
            var description = {
                name : 'name',
                tooltip : 'tooltip',
                iconUrl : 'iconUrl'
            };

            expect(function() {
                return new ImageryProviderViewModel(description);
            }).toThrowDeveloperError();
        });
    });
});