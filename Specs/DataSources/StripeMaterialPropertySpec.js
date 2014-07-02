/*global defineSuite*/
defineSuite([
        'DynamicScene/StripeMaterialProperty',
        'Core/Color',
        'Core/JulianDate',
        'Core/TimeInterval',
        'DynamicScene/ConstantProperty',
        'DynamicScene/StripeOrientation',
        'DynamicScene/TimeIntervalCollectionProperty',
        'Specs/testDefinitionChanged'
    ], function(
        StripeMaterialProperty,
        Color,
        JulianDate,
        TimeInterval,
        ConstantProperty,
        StripeOrientation,
        TimeIntervalCollectionProperty,
        testDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor provides the expected defaults', function() {
        var property = new StripeMaterialProperty();
        expect(property.orientation).toEqual(new ConstantProperty(StripeOrientation.HORIZONTAL));
        expect(property.evenColor).toEqual(new ConstantProperty(Color.WHITE));
        expect(property.oddColor).toEqual(new ConstantProperty(Color.BLACK));
        expect(property.offset).toEqual(new ConstantProperty(0));
        expect(property.repeat).toEqual(new ConstantProperty(1));
        expect(property.getType()).toEqual('Stripe');
        expect(property.isConstant).toBe(true);
    });

    it('works with constant values', function() {
        var property = new StripeMaterialProperty();
        property.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
        property.evenColor = new ConstantProperty(Color.RED);
        property.oddColor = new ConstantProperty(Color.BLUE);
        property.offset = new ConstantProperty(10);
        property.repeat = new ConstantProperty(20);

        var result = property.getValue(JulianDate.now());
        expect(result.horizontal).toEqual(false);
        expect(result.evenColor).toEqual(Color.RED);
        expect(result.oddColor).toEqual(Color.BLUE);
        expect(result.offset).toEqual(10);
        expect(result.repeat).toEqual(20);
    });

    it('works with undefined values', function() {
        var property = new StripeMaterialProperty();
        property.orientation = new ConstantProperty();
        property.evenColor = new ConstantProperty();
        property.oddColor = new ConstantProperty();
        property.offset = new ConstantProperty();
        property.repeat = new ConstantProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('horizontal')).toEqual(true);
        expect(result.horizontal).toBeUndefined();
        expect(result.hasOwnProperty('evenColor')).toEqual(true);
        expect(result.evenColor).toBeUndefined();
        expect(result.hasOwnProperty('oddColor')).toEqual(true);
        expect(result.oddColor).toBeUndefined();
        expect(result.hasOwnProperty('offset')).toEqual(true);
        expect(result.offset).toBeUndefined();
        expect(result.hasOwnProperty('repeat')).toEqual(true);
        expect(result.repeat).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new StripeMaterialProperty();
        property.orientation = new TimeIntervalCollectionProperty();
        property.evenColor = new TimeIntervalCollectionProperty();
        property.oddColor = new TimeIntervalCollectionProperty();
        property.offset = new TimeIntervalCollectionProperty();
        property.repeat = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.orientation.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : false
        }));
        property.evenColor.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.RED
        }));
        property.oddColor.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : Color.BLUE
        }));
        property.offset.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 10
        }));
        property.repeat.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            data : 20
        }));

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.horizontal).toEqual(false);
        expect(result.evenColor).toEqual(Color.RED);
        expect(result.oddColor).toEqual(Color.BLUE);
        expect(result.offset).toEqual(10);
        expect(result.repeat).toEqual(20);
    });

    it('works with a result parameter', function() {
        var property = new StripeMaterialProperty();
        property.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
        property.evenColor = new ConstantProperty(Color.RED);
        property.oddColor = new ConstantProperty(Color.BLUE);
        property.offset = new ConstantProperty(10);
        property.repeat = new ConstantProperty(20);

        var result = {
            horizontal : true,
            evenColor : Color.YELLOW.clone(),
            oddColor : Color.YELLOW.clone(),
            offset : 3,
            repeat : 4
        };
        var returnedResult = property.getValue(JulianDate.now(), result);
        expect(returnedResult).toBe(result);
        expect(result.horizontal).toEqual(false);
        expect(result.evenColor).toEqual(Color.RED);
        expect(result.oddColor).toEqual(Color.BLUE);
        expect(result.offset).toEqual(10);
        expect(result.repeat).toEqual(20);
    });

    it('equals works', function() {
        var left = new StripeMaterialProperty();
        left.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
        left.evenColor = new ConstantProperty(Color.RED);
        left.oddColor = new ConstantProperty(Color.BLUE);
        left.offset = new ConstantProperty(10);
        left.repeat = new ConstantProperty(20);

        var right = new StripeMaterialProperty();
        right.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
        right.evenColor = new ConstantProperty(Color.RED);
        right.oddColor = new ConstantProperty(Color.BLUE);
        right.offset = new ConstantProperty(10);
        right.repeat = new ConstantProperty(20);

        expect(left.equals(right)).toEqual(true);

        right.orientation = new ConstantProperty(StripeOrientation.HORIZONTAL);
        expect(left.equals(right)).toEqual(false);

        right.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
        right.evenColor = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);

        right.evenColor = new ConstantProperty(Color.RED);
        right.oddColor = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);

        right.oddColor = new ConstantProperty(Color.BLUE);
        right.offset = new ConstantProperty(1);
        expect(left.equals(right)).toEqual(false);

        right.offset = new ConstantProperty(10);
        right.repeat = new ConstantProperty(2);
        expect(left.equals(right)).toEqual(false);

        right.repeat = new ConstantProperty(20);
        expect(left.equals(right)).toEqual(true);
    });

    it('raises definitionChanged when a property is assigned or modified', function() {
        var property = new StripeMaterialProperty();
        testDefinitionChanged(property, 'orientation', false, true);
        testDefinitionChanged(property, 'evenColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'oddColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'offset', 2, 5);
        testDefinitionChanged(property, 'repeat', 3, 4);
    });
});