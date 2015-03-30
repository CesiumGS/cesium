/*global defineSuite*/
defineSuite([
        'Widgets/NavigationHelpButton/NavigationHelpButton',
        'Specs/DomEventSimulator'
    ], function(
        NavigationHelpButton,
        DomEventSimulator) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('can create and destroy', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new NavigationHelpButton({
            container : 'testContainer'
        });
        expect(widget.container).toBe(container);
        expect(widget.isDestroyed()).toEqual(false);

        widget.destroy();
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);
    });

    it('does not show instructions by default', function() {
        var widget = new NavigationHelpButton({
            container : document.body
        });
        expect(widget.viewModel.showInstructions).toBe(false);
        widget.destroy();
    });

    it('shows instructions by default if told to do so in the constructor', function() {
        var widget = new NavigationHelpButton({
            container : document.body,
            instructionsInitiallyVisible : true
        });
        expect(widget.viewModel.showInstructions).toBe(true);
        widget.destroy();
    });

    it('mousedown event closes dropdown if target is not inside container', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new NavigationHelpButton({
            container : 'testContainer'
        });

        widget.viewModel.showInstructions = true;
        DomEventSimulator.fireMouseDown(document.body);
        expect(widget.viewModel.showInstructions).toEqual(false);

        widget.viewModel.showInstructions = true;
        DomEventSimulator.fireMouseDown(container.firstChild);
        expect(widget.viewModel.showInstructions).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('touchstart event closes dropdown if target is not inside container', function() {
        var container = document.createElement('span');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var widget = new NavigationHelpButton({
            container : 'testContainer'
        });

        widget.viewModel.showInstructions = true;
        DomEventSimulator.fireTouchStart(document.body);
        expect(widget.viewModel.showInstructions).toEqual(false);

        widget.viewModel.showInstructions = true;
        DomEventSimulator.fireTouchStart(container.firstChild);
        expect(widget.viewModel.showInstructions).toEqual(true);

        widget.destroy();
        document.body.removeChild(container);
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new NavigationHelpButton({
                container : undefined
            });
        }).toThrowDeveloperError();
    });

    it('throws if options is undefined', function() {
        expect(function() {
            return new NavigationHelpButton(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if options.container is undefined', function() {
        expect(function() {
            return new NavigationHelpButton({
                container : undefined
            });
        }).toThrowDeveloperError();
    });

    it('constructor throws with string element that does not exist', function() {
        expect(function() {
            return new NavigationHelpButton({
                container : 'does not exist'
            });
        }).toThrowDeveloperError();
    });
});