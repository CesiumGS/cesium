defineSuite([
        'Widgets/InfoBox/InfoBox',
        'Core/defined',
        'Core/oneTimeWarning',
        'Specs/pollToPromise'
    ], function(
        InfoBox,
        defined,
        oneTimeWarning,
        pollToPromise) {
    'use strict';

    var testContainer;
    var infoBox;
    beforeEach(function() {
        testContainer = document.createElement('span');
        testContainer.id = 'testContainer';
        document.body.appendChild(testContainer);
    });

    afterEach(function() {
        if (defined(infoBox) && !infoBox.isDestroyed()) {
            infoBox = infoBox.destroy();
        }
        document.body.removeChild(testContainer);
    });

    describe('stringToHtml', function() {

        var element;
        beforeEach(function() {
            element = document.createElement('div');
            element.id = 'testElement';
            spyOn(element, 'appendChild').and.callThrough();
            element.testFunction = function(arg){};
            spyOn(element, 'testFunction');
        });

       it('should set the HTML of the frame when no script tag is available', function() {
           var s = '<div>string</div>';
           InfoBox.stringToHtml(s, element);
           expect(element.innerHTML).toBe(s);
           expect(element.appendChild).not.toHaveBeenCalled();
       });

        it('should set the HTML of the frame when when `allowScripts` is false', function() {
            var s = '<script>string</script>';
            InfoBox.stringToHtml(s, element, false);
            expect(element.innerHTML).toBe(s);
            expect(element.appendChild).not.toHaveBeenCalled();
        });

       describe('Handle script tags', function() {
           var elementString = '<script>testElement.testFunction();</script>';
           it('should set the HTML content of the frame', function() {
               InfoBox.stringToHtml(elementString, element, true);
               expect(element.innerHTML).toBe(elementString);
           });

           it('should run appendChild with contextualFragment if supported', function(){
               document.body.append(element);
               InfoBox.stringToHtml(elementString, element, true);
               expect(element.appendChild).toHaveBeenCalled();
               expect(element.appendChild.calls.mostRecent().args[0].nodeType).toEqual(11);
               expect(element.testFunction).toHaveBeenCalled();
               document.body.removeChild(element);
           });
       });
    });

    it('constructor sets expected values', function() {
        infoBox = new InfoBox(testContainer);
        expect(infoBox.allowScripts).toBe(false);
        expect(infoBox.container).toBe(testContainer);
        expect(infoBox.viewModel).toBeDefined();
        expect(infoBox.isDestroyed()).toEqual(false);
        infoBox.destroy();
        expect(infoBox.isDestroyed()).toEqual(true);
    });

    it('can set description body', function() {
        var infoBox = new InfoBox(testContainer);
        var node;

        var infoElement = testContainer.firstChild;

        infoBox.viewModel.description = 'Please do not crash';
        return pollToPromise(function() {
            node = infoBox.frame.contentDocument.body.firstChild;
            return node !== null;
        }).then(function() {
            expect(infoElement.style['background-color']).toEqual('');
            return pollToPromise(function() {
                return node.innerHTML === infoBox.viewModel.description;
            });
        }).then(function() {
            infoBox.viewModel.description = '<div style="background-color: rgb(255, 255, 255);">Please do not crash</div>';
            expect(infoElement.style['background-color']).toEqual('rgb(255, 255, 255)');
            return pollToPromise(function() {
                return node.innerHTML === infoBox.viewModel.description;
            });
        }).then(function() {
            expect(infoElement['background-color']).toBeUndefined();
        });
    });

    it('constructor works with string id container', function() {
        infoBox = new InfoBox('testContainer');
        expect(infoBox.container.id).toBe(testContainer.id);
    });

    it('throws if container is undefined', function() {
        expect(function() {
            return new InfoBox(undefined);
        }).toThrowDeveloperError();
    });

    it('throws if container string is undefined', function() {
        expect(function() {
            return new InfoBox('foo');
        }).toThrowDeveloperError();
    });

    describe('createFrame', function() {
        beforeEach(function() {
            infoBox = new InfoBox('testContainer');
        });

        it('should call removeFrame', function() {
            spyOn(infoBox, 'removeFrame').and.returnValue({});
            infoBox.createFrame();
            expect(infoBox.removeFrame).toHaveBeenCalled();
        });

        it('should append a frame to _element', function() {
            spyOn(infoBox._element, 'appendChild').and.callThrough();
            infoBox.createFrame();
            expect(infoBox._element.appendChild).toHaveBeenCalledWith(infoBox._frame);
        });
    });

    describe('removeFrame', function() {
        beforeEach(function() {
            infoBox = new InfoBox('testContainer');
        });
        it('should call remove child of parent (_element)', function() {
            spyOn(infoBox._element, 'removeChild').and.callThrough();
            var frame = infoBox._frame;
            infoBox.removeFrame();
            expect(infoBox._element.removeChild).toHaveBeenCalledWith(frame);
        });
    });

    describe('allowScripts setter', function() {
        beforeEach(function() {
            infoBox = new InfoBox('testContainer');
            spyOn(infoBox, 'createFrame').and.returnValue({});
        });

        it('should set _allowScripts', function() {
            infoBox.allowScripts = true;
            expect(infoBox.allowScripts).toBeTruthy();
            infoBox.allowScripts = false;
            expect(infoBox.allowScripts).toBeFalsy();
        });

        it('should call createFrame when sent with true and different from current value', function() {
            infoBox._allowScripts = true;
            infoBox.allowScripts = true;
            expect(infoBox.createFrame).not.toHaveBeenCalled();
            infoBox.allowScripts = false;
            infoBox.allowScripts = true;
            expect(infoBox.createFrame).toHaveBeenCalled();
        });
    });
});
