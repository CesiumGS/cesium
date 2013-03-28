/*global defineSuite*/
defineSuite(['Widgets/BaseLayerPicker/ImageryProviderViewModel',
             'Widgets/createCommand',
             'ThirdParty/knockout'
            ], function(
              ImageryProviderViewModel,
              createCommand,
              knockout) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected parameters', function() {
        var description = {
            name : knockout.observable('name'),
            tooltip : knockout.observable('tooltip'),
            iconUrl : knockout.observable('iconUrl'),
            creationCommand : createCommand(function() {
            })
        };

        var viewModel = new ImageryProviderViewModel(description);
        expect(viewModel.name).toBe(description.name);
        expect(viewModel.tooltip).toBe(description.tooltip);
        expect(viewModel.iconUrl).toBe(description.iconUrl);
        expect(viewModel.creationCommand).toBe(description.creationCommand);
    });

    it('constructor throws with no name', function() {
        var description = {
            tooltip : knockout.observable('tooltip'),
            iconUrl : knockout.observable('iconUrl'),
            creationCommand : createCommand(function() {
            })
        };

        expect(function() {
            return new ImageryProviderViewModel(description);
        }).toThrow();
    });

    it('constructor throws with no tooltip', function() {
        var description = {
            name : knockout.observable('name'),
            iconUrl : knockout.observable('iconUrl'),
            creationCommand : createCommand(function() {
            })
        };

        expect(function() {
            return new ImageryProviderViewModel(description);
        }).toThrow();
    });

    it('constructor throws with no iconUrl', function() {
        var description = {
            name : knockout.observable('name'),
            tooltip : knockout.observable('tooltip'),
            creationCommand : createCommand(function() {
            })
        };

        expect(function() {
            return new ImageryProviderViewModel(description);
        }).toThrow();
    });

    it('constructor throws with no creationCommand', function() {
        var description = {
            name : knockout.observable('name'),
            tooltip : knockout.observable('tooltip'),
            iconUrl : knockout.observable('iconUrl')
        };

        expect(function() {
            return new ImageryProviderViewModel(description);
        }).toThrow();
    });

    it('fromConstants sets expected parameters', function() {
        var called = false;
        var description = {
            name : 'name',
            tooltip : 'tooltip',
            iconUrl : 'iconUrl',
            creationFunction : function() {
                called = true;
            }
        };

        var viewModel = ImageryProviderViewModel.fromConstants(description);
        expect(viewModel.name()).toEqual(description.name);
        expect(viewModel.tooltip()).toEqual(description.tooltip);
        expect(viewModel.iconUrl()).toEqual(description.iconUrl);
        expect(viewModel.creationCommand).toBeDefined();
        viewModel.creationCommand();
        expect(called).toEqual(true);
    });

    it('fromConstants throws with no name', function() {
        var description = {
            tooltip : 'tooltip',
            iconUrl : 'iconUrl',
            creationFunction : function() {
            }
        };

        expect(function() {
            return ImageryProviderViewModel.fromConstants(description);
        }).toThrow();
    });

    it('fromConstants throws with no tooltip', function() {
        var description = {
            name : 'name',
            iconUrl : 'iconUrl',
            creationFunction : function() {
            }
        };

        expect(function() {
            return ImageryProviderViewModel.fromConstants(description);
        }).toThrow();
    });

    it('fromConstants throws with no iconUrl', function() {
        var description = {
            name : 'name',
            tooltip : 'tooltip',
            creationFunction : function() {
            }
        };

        expect(function() {
            return ImageryProviderViewModel.fromConstants(description);
        }).toThrow();
    });

    it('fromConstants throws with no creationFunction', function() {
        var description = {
            name : 'name',
            tooltip : 'tooltip',
            iconUrl : 'iconUrl'
        };

        expect(function() {
            return ImageryProviderViewModel.fromConstants(description);
        }).toThrow();
    });
});