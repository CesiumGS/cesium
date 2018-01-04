defineSuite([
        'Scene/CreditDisplay',
        'Core/defined',
        'Core/Credit'
    ], function(
        CreditDisplay,
        defined,
        Credit) {
    'use strict';

    var container;
    var imageContainer = 'cesium-credit-imageContainer';
    var textContainer = 'cesium-credit-textContainer';
    var text = 'cesium-credit-text';
    var image = 'cesium-credit-image';
    var imgSrc = 'imagesrc';
    var delimiter = 'cesium-credit-delimiter';
    var creditDisplay;

    beforeEach(function() {
        container = document.createElement('div');
        container.id = 'credit-container';
    });

    afterEach(function(){
        if (defined(creditDisplay)) {
            creditDisplay.destroy();
            creditDisplay = undefined;
        }
    });

    it('credit display throws with no container', function() {
        expect(function() {
            return new CreditDisplay();
        }).toThrowDeveloperError();
    });

    it('credit display addCredit throws when credit is undefined', function() {
        expect(function() {
            creditDisplay = new CreditDisplay(container);
            creditDisplay.addCredit();
        }).toThrowDeveloperError();
    });

    it('credit display addDefaultCredit throws when credit is undefined', function() {
        expect(function() {
            creditDisplay = new CreditDisplay(container);
            creditDisplay.addDefaultCredit();
        }).toThrowDeveloperError();
    });

    it('credit display removeDefaultCredit throws when credit is undefined', function() {
        expect(function() {
            creditDisplay = new CreditDisplay(container);
            creditDisplay.removeDefaultCredit();
        }).toThrowDeveloperError();
    });

    it('credits have unique ids', function() {
        var credit1 = new Credit({
            text: 'credit1',
            imageUrl: imgSrc,
            link: 'http://cesiumjs.org/'
        });
        var credit2 = new Credit({
            text: 'credit2',
            imageUrl: imgSrc,
            link: 'http://cesiumjs.org/'
        });
        expect(credit1.id).not.toEqual(credit2.id);

        var credit1a = new Credit({
            text: 'credit1',
            imageUrl: imgSrc,
            link: 'http://cesiumjs.org/'
        });
        expect(credit1.id).toEqual(credit1a.id);
    });

    it('credit display displays text credit', function() {
        creditDisplay = new CreditDisplay(container);
        var credit = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();
        expect(container.childNodes.length).toEqual(3);
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(1);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('credit1');
    });

    it('credit display displays image credit', function() {
        creditDisplay = new CreditDisplay(container);
        var credit = new Credit({
            imageUrl: imgSrc,
            showOnScreen: true
        });
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();

        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(1);
        expect(child1.childNodes.length).toEqual(0);
        var child00 = child0.childNodes[0];
        expect(child00.className).toEqual(image);
        expect(child00.childNodes.length).toEqual(1);
        expect(child00.childNodes[0].src).toContain(imgSrc);
    });

    it('credit display displays hyperlink credit', function() {
        creditDisplay = new CreditDisplay(container);
        var link = 'http://cesiumjs.org/';
        var credit = new Credit({
            link: link,
            showOnScreen: true
        });
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit);
        creditDisplay.endFrame();

        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(1);
        var child10 = child1.childNodes[0];
        expect(child10.className).toEqual(text);
        expect(child10.childNodes.length).toEqual(1);
        expect(child10.childNodes[0].href).toEqual(link);
        expect(child10.childNodes[0].innerHTML).toEqual(link);
    });

    it('credit display updates html when credits change', function() {
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        var credit2 = new Credit({
            imageUrl: imgSrc,
            showOnScreen: true
        });

        creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        var innerHTML = container.innerHTML;
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(1);
        expect(child1.childNodes[0].innerHTML).toEqual('credit1');

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).not.toEqual(innerHTML);
        innerHTML = container.innerHTML;
        child0 = container.childNodes[0];
        child1 = container.childNodes[1];
        expect(child0.childNodes.length).toEqual(1);
        expect(child1.childNodes.length).toEqual(0);
        var child00 = child0.childNodes[0];
        expect(child00.childNodes.length).toEqual(1);
        expect(child00.childNodes[0].src).toContain(imgSrc);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(container.innerHTML).not.toEqual(innerHTML);
        innerHTML = container.innerHTML;
        expect(container.childNodes[0].childNodes.length).toEqual(1);
        expect(container.childNodes[1].childNodes.length).toEqual(1);

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(container.innerHTML).not.toEqual(innerHTML);
        expect(container.childNodes[0].childNodes.length).toEqual(0);
        expect(container.childNodes[1].childNodes.length).toEqual(0);
    });

    it('credit display uses delimeter for text credits', function() {
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        var credit2 = new Credit({
            text: 'credit2',
            showOnScreen: true
        });
        creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();

        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(3);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('credit1');
        expect(child1.childNodes[1].className).toEqual(delimiter);
        expect(child1.childNodes[1].innerHTML).toEqual(', ');
        expect(child1.childNodes[2].className).toEqual(text);
        expect(child1.childNodes[2].innerHTML).toEqual('credit2');
    });

    it('credit display manages delimeters correctly for text credits', function() {
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        var credit2 = new Credit({
            text: 'credit2',
            showOnScreen: true
        });
        var credit3 = new Credit({
            text: 'credit3',
            showOnScreen: true
        });

        creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(5);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[1].className).toEqual(delimiter);
        expect(child1.childNodes[2].className).toEqual(text);
        expect(child1.childNodes[3].className).toEqual(delimiter);
        expect(child1.childNodes[4].className).toEqual(text);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(3);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[1].className).toEqual(delimiter);
        expect(child1.childNodes[2].className).toEqual(text);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(1);
        expect(child1.childNodes[0].className).toEqual(text);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.addCredit(credit3);
        creditDisplay.endFrame();
        child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(3);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[1].className).toEqual(delimiter);
        expect(child1.childNodes[2].className).toEqual(text);
    });

    it('credit display uses text as title for image credit', function() {
        var credit1 = new Credit({
            text: 'credit text',
            imageUrl: imgSrc,
            showOnScreen: true
        });
        creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();

        var child0 = container.childNodes[0];
        expect(child0.className).toEqual(imageContainer);
        expect(child0.childNodes.length).toEqual(1);
        var child00 = child0.childNodes[0];
        expect(child00.className).toEqual(image);
        expect(child00.childNodes.length).toEqual(1);
        expect(child00.childNodes[0].src).toContain(imgSrc);
        expect(child00.childNodes[0].alt).toEqual('credit text');
        expect(child00.childNodes[0].title).toEqual('credit text');
    });

    it('credit display creates image credit with hyperlink', function() {
        var credit1 = new Credit({
            imageUrl: imgSrc,
            link: 'link.com',
            showOnScreen: true
        });
        creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();

        var child0 = container.childNodes[0];
        expect(child0.className).toEqual(imageContainer);
        expect(child0.childNodes.length).toEqual(1);
        var child00 = child0.childNodes[0];
        expect(child00.className).toEqual(image);
        expect(child00.childNodes.length).toEqual(1);
        var child000 = child00.childNodes[0];
        expect(child000.href).toContain('link.com');
        expect(child000.childNodes.length).toEqual(1);
        expect(child000.childNodes[0].src).toContain(imgSrc);
    });

    it('credit display displays default credit', function() {
        var defaultCredit = new Credit({
            text: 'default credit',
            showOnScreen: true
        });
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });

        creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();

        var child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(3);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('default credit');
        expect(child1.childNodes[1].className).toEqual(delimiter);
        expect(child1.childNodes[1].innerHTML).toEqual(', ');
        expect(child1.childNodes[2].className).toEqual(text);
        expect(child1.childNodes[2].innerHTML).toEqual('credit1');

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(1);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('default credit');
    });

    it('credit display displays credits when default is removed', function() {
        var defaultCredit = new Credit({
            text: 'defaultCredit',
            showOnScreen: true
        });
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });

        creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        var child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(3);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('defaultCredit');
        expect(child1.childNodes[1].className).toEqual(delimiter);
        expect(child1.childNodes[1].innerHTML).toEqual(', ');
        expect(child1.childNodes[2].className).toEqual(text);
        expect(child1.childNodes[2].innerHTML).toEqual('credit1');

        creditDisplay.removeDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        child1 = container.childNodes[1];
        expect(child1.className).toEqual(textContainer);
        expect(child1.childNodes.length).toEqual(1);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('credit1');
    });

    it('credit display displays default image credit', function() {
        var defaultCredit = new Credit({
            imageUrl: imgSrc,
            showOnScreen: true
        });
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(1);
        expect(child1.childNodes.length).toEqual(1);

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        child0 = container.childNodes[0];
        child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(1);
        expect(child1.childNodes.length).toEqual(0);
    });

    it('credit display displays credits when default image is removed', function() {
        var defaultCredit = new Credit({
            imageUrl: imgSrc,
            showOnScreen: true
        });
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });

        creditDisplay = new CreditDisplay(container, ', ');
        creditDisplay.addDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(1);
        expect(child1.childNodes.length).toEqual(1);

        creditDisplay.removeDefaultCredit(defaultCredit);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();
        child0 = container.childNodes[0];
        child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(1);
    });

    it('credit display only displays one if two image credits are equal', function() {
        var credit1 = new Credit({
            imageUrl: imgSrc,
            showOnScreen: true
        });
        var credit2 = new Credit({
            imageUrl: imgSrc,
            showOnScreen: true
        });
        creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(1);
        expect(child1.childNodes.length).toEqual(0);
        var child00 = child0.childNodes[0];
        expect(child00.className).toEqual(image);
        expect(child00.childNodes.length).toEqual(1);
        expect(child00.childNodes[0].src).toContain(imgSrc);

    });

    it('credit display only displays one if two text credits are equal', function() {
        var credit1 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        var credit2 = new Credit({
            text: 'credit1',
            showOnScreen: true
        });
        creditDisplay = new CreditDisplay(container);
        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        var child0 = container.childNodes[0];
        var child1 = container.childNodes[1];
        expect(child0.className).toEqual(imageContainer);
        expect(child1.className).toEqual(textContainer);
        expect(child0.childNodes.length).toEqual(0);
        expect(child1.childNodes.length).toEqual(1);
        expect(child1.childNodes[0].className).toEqual(text);
        expect(child1.childNodes[0].innerHTML).toEqual('credit1');
    });

    it('displays credits in a lightbox', function() {
        var credit1 = new Credit({text: 'credit1'});
        var credit2 = new Credit({imageUrl: imgSrc});

        creditDisplay = new CreditDisplay(container);
        var creditList = creditDisplay._creditList;

        creditDisplay.showLightbox();

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.endFrame();

        var innerHTML = creditList.innerHTML;
        expect(creditList.childNodes.length).toEqual(1);
        expect(creditList.childNodes[0].innerHTML).toEqual('credit1');

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(creditList.innerHTML).not.toEqual(innerHTML);
        innerHTML = creditList.innerHTML;
        expect(creditList.childNodes.length).toEqual(1);
        expect(creditList.childNodes[0].childNodes[0].src).toContain(imgSrc);

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(creditList.innerHTML).not.toEqual(innerHTML);
        innerHTML = creditList.innerHTML;
        expect(creditList.childNodes.length).toEqual(2);

        creditDisplay.beginFrame();
        creditDisplay.endFrame();
        expect(creditList.innerHTML).not.toEqual(innerHTML);
        expect(creditList.childNodes.length).toEqual(0);

        creditDisplay.hideLightbox();
    });

    it('only renders lightbox credits when lightbox is visible', function() {
        var credit1 = new Credit({text: 'credit1'});
        var credit2 = new Credit({imageUrl: imgSrc});

        creditDisplay = new CreditDisplay(container);
        var creditList = creditDisplay._creditList;

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(creditList.childNodes.length).toEqual(0);

        creditDisplay.showLightbox();

        creditDisplay.beginFrame();
        creditDisplay.addCredit(credit1);
        creditDisplay.addCredit(credit2);
        creditDisplay.endFrame();
        expect(creditList.childNodes.length).toEqual(2);

        creditDisplay.hideLightbox();
    });
});
