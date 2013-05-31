/*global defineSuite*/
defineSuite(['Widgets/Viewer/Viewer',
             'Widgets/Animation/Animation',
             'Widgets/BaseLayerPicker/BaseLayerPicker',
             'Widgets/BaseLayerPicker/ImageryProviderViewModel',
             'Widgets/CesiumWidget/CesiumWidget',
             'Widgets/FullscreenButton/FullscreenButton',
             'Widgets/HomeButton/HomeButton',
             'Widgets/SceneModePicker/SceneModePicker',
             'Widgets/Timeline/Timeline',
             'Core/TimeInterval',
             'DynamicScene/DataSourceDisplay',
             'DynamicScene/DataSourceCollection',
             'Scene/EllipsoidTerrainProvider',
             'Scene/SceneMode'
            ], function(
                    Viewer,
                    Animation,
                    BaseLayerPicker,
                    ImageryProviderViewModel,
                    CesiumWidget,
                    FullscreenButton,
                    HomeButton,
                    SceneModePicker,
                    Timeline,
                    TimeInterval,
                    DataSourceDisplay,
                    DataSourceCollection,
                    EllipsoidTerrainProvider,
                    SceneMode) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var container;
    beforeEach(function(){
        container = document.createElement('span');
        container.id = 'container';
        container.style.display = 'none';
        document.body.appendChild(container);

        //Impersonate FielReader for drag and drop tests
        var fakeFileReader = jasmine.createSpyObj('FileReader', ['readAsText']);
        fakeFileReader.readAsText = function(file) {
            if (typeof file.czmlString !== 'undefined') {
                this.onload({
                    target : {
                        result : file.czmlString
                    }
                });
            } else {
                this.onerror({
                    target : {
                        error : file.errorMessage
                    }
                });
            }
        };
        spyOn(window, 'FileReader').andReturn(fakeFileReader);
    });

    afterEach(function(){
        document.body.removeChild(container);
    });

    it('constructor sets default values', function() {
        var viewer = new Viewer(container);
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        expect(viewer.dataSourceDisplay).toBeInstanceOf(DataSourceDisplay);
        expect(viewer.dataSources).toBeInstanceOf(DataSourceCollection);
        viewer.destroy();
    });

    it('constructor works with container id string', function() {
        var viewer = new Viewer('container');
        expect(viewer.container).toBe(container);
        viewer.destroy();
    });

    it('can shut off HomeButton', function() {
        var viewer = new Viewer(container, {
            homeButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeUndefined();
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off SceneModePicker', function() {
        var viewer = new Viewer(container, {
            sceneModePicker : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeUndefined();
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off BaseLayerPicker', function() {
        var viewer = new Viewer(container, {
            baseLayerPicker : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeUndefined();
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off Animation', function() {
        var viewer = new Viewer(container, {
            animation : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeUndefined();
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off Timeline', function() {
        var viewer = new Viewer(container, {
            timeline : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeUndefined();
        expect(viewer.fullscreenButton).toBeInstanceOf(FullscreenButton);
        viewer.destroy();
    });

    it('can shut off FullscreenButton', function() {
        var viewer = new Viewer(container, {
            fullscreenButton : false
        });
        expect(viewer.container).toBe(container);
        expect(viewer.cesiumWidget).toBeInstanceOf(CesiumWidget);
        expect(viewer.homeButton).toBeInstanceOf(HomeButton);
        expect(viewer.sceneModePicker).toBeInstanceOf(SceneModePicker);
        expect(viewer.baseLayerPicker).toBeInstanceOf(BaseLayerPicker);
        expect(viewer.animation).toBeInstanceOf(Animation);
        expect(viewer.timeline).toBeInstanceOf(Timeline);
        expect(viewer.fullscreenButton).toBeUndefined();
        viewer.destroy();
    });

    it('can set terrainProvider', function() {
        var provider = new EllipsoidTerrainProvider();
        var viewer = new Viewer(container, {
            terrainProvider : provider
        });
        expect(viewer.centralBody.terrainProvider).toBe(provider);
        viewer.destroy();
    });

    it('can set fullScreenElement', function() {
        var testElement = document.createElement('span');
        var viewer = new Viewer(container, {
            fullscreenElement : testElement
        });
        expect(viewer.fullscreenButton.viewModel.fullscreenElement).toBe(testElement);
        viewer.destroy();
    });

    it('can set scene mode', function() {
        var viewer = new Viewer(container, {
            sceneMode : SceneMode.SCENE2D
        });
        expect(viewer.scene.mode).toBe(SceneMode.SCENE2D);
        viewer.destroy();
    });

    var testProvider = {
            isReady : function() {
                return false;
            }
        };

    var testProviderViewModel = ImageryProviderViewModel.fromConstants({
        name : 'name',
        tooltip : 'tooltip',
        iconUrl : 'url',
        creationFunction : function() {
            return testProvider;
        }
    });

    it('can set selectedImageryProviderViewModel', function() {
        var viewer = new Viewer(container, {
            selectedImageryProviderViewModel : testProviderViewModel
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem).toBe(testProviderViewModel);
        viewer.destroy();
    });

    it('can set imageryProviderViewModels', function() {
        var models = [testProviderViewModel];
        var viewer = new Viewer(container, {
            imageryProviderViewModels : models
        });
        expect(viewer.centralBody.getImageryLayers().getLength()).toEqual(1);
        expect(viewer.centralBody.getImageryLayers().get(0).getImageryProvider()).toBe(testProvider);
        expect(viewer.baseLayerPicker.viewModel.selectedItem).toBe(testProviderViewModel);
        expect(viewer.baseLayerPicker.viewModel.imageryProviderViewModels).toEqual(models);
        viewer.destroy();
    });

    var czml1 = {
            id : 'test',
            availability : '2000-01-01/2001-01-01',
            billboard : {
                show : true
            }
        };

    var czml2 = {
            id : 'test2',
            availability : '2000-01-02/2001-01-02',
            billboard : {
                show : true
            }
        };

    it('handleDrop processes drop event', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : JSON.stringify(czml1)
                }]
            }
        };

        var viewer = new Viewer(container);
        viewer.handleDrop(mockEvent);
        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 1;
            if (result) {
                var dataSource = viewer.dataSources.get(0);
                var interval = TimeInterval.fromIso8601(czml1.availability);
                expect(dataSource.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(dataSource.getClock().startTime).toEqual(interval.start);
                expect(dataSource.getClock().stopTime).toEqual(interval.stop);
                viewer.destroy();
            }
            return result;
        });
    });

    it('handleDrop processes drop event with multiple files', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : JSON.stringify(czml1)
                }, {
                    name : 'czml2',
                    czmlString : JSON.stringify(czml2)
                }]
            }
        };

        var viewer = new Viewer(container);
        viewer.handleDrop(mockEvent);
        waitsFor(function() {
            var result = viewer.dataSources.getLength() === 2;
            if (result) {
                var source1 = viewer.dataSources.get(0);
                var source2 = viewer.dataSources.get(1);
                expect(source1.getDynamicObjectCollection().getObject('test')).toBeDefined();
                expect(source2.getDynamicObjectCollection().getObject('test2')).toBeDefined();
                //Interval of first file should be used.
                var interval = TimeInterval.fromIso8601(czml1.availability);
                expect(source1.getClock().startTime).toEqual(interval.start);
                expect(source1.getClock().stopTime).toEqual(interval.stop);
                viewer.destroy();
            }
            return result;
        });
    });

    it('handleDrop calls error callback on exception', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    czmlString : 'bad JSON'
                }]
            }
        };

        var viewer = new Viewer(container);
        var called = false;
        function onError(viewerArg, source, error) {
            expect(viewerArg).toBe(viewer);
            expect(source).toEqual('czml1');
            expect(error).toBeInstanceOf(SyntaxError);
            called = true;
        }
        viewer.handleDrop(mockEvent, onError);
        waitsFor(function() {
            if (called) {
                viewer.destroy();
            }
            return called;
        });
    });

    it('handleDrop calls error callback on FileReader error', function() {
        var mockEvent = {
            dataTransfer : {
                files : [{
                    name : 'czml1',
                    errorMessage : 'bad JSON'
                }]
            }
        };

        var viewer = new Viewer(container);
        var called = false;
        function onError(viewerArg, source, error) {
            expect(viewerArg).toBe(viewer);
            expect(source).toEqual(mockEvent.dataTransfer.files[0].name);
            expect(error).toEqual(mockEvent.dataTransfer.files[0].errorMessage);
            called = true;
        }
        viewer.handleDrop(mockEvent, onError);
        waitsFor(function() {
            if (called) {
                viewer.destroy();
            }
            return called;
        });
    });

    it('enableDragAndDrop/disableDragAndDrop subscribe to provided container.', function() {
        var viewer = new Viewer(container);

        var events = {};
        var mockContainer = {
            addEventListener : function(name, func, bubble) {
                events[name] = {
                    func : func,
                    bubble : bubble
                };
            },
            removeEventListener : function(name, func, bubble) {
                var subscribed = events[name];
                expect(subscribed.func).toBe(func);
                expect(subscribed.bubble).toEqual(bubble);
                delete events[name];
            }
        };

        viewer.enableDragAndDrop(mockContainer);
        expect(events.drop).toBeDefined();
        expect(events.dragenter).toBeDefined();
        expect(events.dragover).toBeDefined();
        expect(events.dragexit).toBeDefined();

        viewer.disableDragAndDrop();
        expect(events.drop).toBeUndefined();
        expect(events.dragenter).toBeUndefined();
        expect(events.dragover).toBeUndefined();
        expect(events.dragexit).toBeUndefined();

        viewer.destroy();
    });

    it('constructor throws with undefined container', function() {
        expect(function() {
            return new Viewer(undefined);
        }).toThrow();
    });

    it('constructor throws with non-existant string container', function() {
        expect(function() {
            return new Viewer('doesNotExist');
        }).toThrow();
    });

    it('handleDrop throws with undefined event', function() {
        var viewer = new Viewer(container);
        expect(function() {
            return viewer.handleDrop(undefined, function() {
            });
        }).toThrow();
        viewer.destroy();
    });
});