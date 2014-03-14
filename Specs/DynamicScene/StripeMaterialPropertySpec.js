/*global defineSuite*/
defineSuite(['DynamicScene/StripeMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/TimeIntervalCollectionProperty',
             'Core/Color',
             'Core/JulianDate',
             'Core/TimeInterval',
             'Specs/testDefinitionChanged'
     ], function(
             StripeMaterialProperty,
             ConstantProperty,
             TimeIntervalCollectionProperty,
             Color,
             JulianDate,
             TimeInterval,
             testDefinitionChanged) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor provides the expected defaults', function() {
        var property = new StripeMaterialProperty();
        expect(property.horizontal).toEqual(new ConstantProperty(true));
        expect(property.lightColor).toEqual(new ConstantProperty(Color.WHITE));
        expect(property.darkColor).toEqual(new ConstantProperty(Color.BLACK));
        expect(property.offset).toEqual(new ConstantProperty(0));
        expect(property.repeat).toEqual(new ConstantProperty(1));
        expect(property.getType()).toEqual('Stripe');
        expect(property.isConstant).toBe(true);
    });

    it('works with constant values', function() {
        var property = new StripeMaterialProperty();
        property.horizontal = new ConstantProperty(false);
        property.lightColor = new ConstantProperty(Color.RED);
        property.darkColor = new ConstantProperty(Color.BLUE);
        property.offset = new ConstantProperty(10);
        property.repeat = new ConstantProperty(20);

        var result = property.getValue(new JulianDate());
        expect(result.horizontal).toEqual(false);
        expect(result.lightColor).toEqual(Color.RED);
        expect(result.darkColor).toEqual(Color.BLUE);
        expect(result.offset).toEqual(10);
        expect(result.repeat).toEqual(20);
    });

    it('works with undefined values', function() {
        var property = new StripeMaterialProperty();
        property.horizontal = new ConstantProperty();
        property.lightColor = new ConstantProperty();
        property.darkColor = new ConstantProperty();
        property.offset = new ConstantProperty();
        property.repeat = new ConstantProperty();

        var result = property.getValue();
        expect(result.hasOwnProperty('horizontal')).toEqual(true);
        expect(result.horizontal).toBeUndefined();
        expect(result.hasOwnProperty('lightColor')).toEqual(true);
        expect(result.lightColor).toBeUndefined();
        expect(result.hasOwnProperty('darkColor')).toEqual(true);
        expect(result.darkColor).toBeUndefined();
        expect(result.hasOwnProperty('offset')).toEqual(true);
        expect(result.offset).toBeUndefined();
        expect(result.hasOwnProperty('repeat')).toEqual(true);
        expect(result.repeat).toBeUndefined();
    });

    it('works with dynamic values', function() {
        var property = new StripeMaterialProperty();
        property.horizontal = new TimeIntervalCollectionProperty();
        property.lightColor = new TimeIntervalCollectionProperty();
        property.darkColor = new TimeIntervalCollectionProperty();
        property.offset = new TimeIntervalCollectionProperty();
        property.repeat = new TimeIntervalCollectionProperty();

        var start = new JulianDate(1, 0);
        var stop = new JulianDate(2, 0);
        property.horizontal.intervals.addInterval(new TimeInterval(start, stop, true, true, false));
        property.lightColor.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.RED));
        property.darkColor.intervals.addInterval(new TimeInterval(start, stop, true, true, Color.BLUE));
        property.offset.intervals.addInterval(new TimeInterval(start, stop, true, true, 10));
        property.repeat.intervals.addInterval(new TimeInterval(start, stop, true, true, 20));

        expect(property.isConstant).toBe(false);

        var result = property.getValue(start);
        expect(result.horizontal).toEqual(false);
        expect(result.lightColor).toEqual(Color.RED);
        expect(result.darkColor).toEqual(Color.BLUE);
        expect(result.offset).toEqual(10);
        expect(result.repeat).toEqual(20);
    });

    it('works with a result parameter', function() {
        var property = new StripeMaterialProperty();
        property.horizontal = new ConstantProperty(false);
        property.lightColor = new ConstantProperty(Color.RED);
        property.darkColor = new ConstantProperty(Color.BLUE);
        property.offset = new ConstantProperty(10);
        property.repeat = new ConstantProperty(20);

        var result = {
            horizontal : true,
            lightColor : Color.YELLOW.clone(),
            darkColor : Color.YELLOW.clone(),
            offset : 3,
            repeat : 4
        };
        var returnedResult = property.getValue(new JulianDate(), result);
        expect(returnedResult).toBe(result);
        expect(result.horizontal).toEqual(false);
        expect(result.lightColor).toEqual(Color.RED);
        expect(result.darkColor).toEqual(Color.BLUE);
        expect(result.offset).toEqual(10);
        expect(result.repeat).toEqual(20);
    });

    it('equals works', function() {
        var left = new StripeMaterialProperty();
        left.horizontal = new ConstantProperty(false);
        left.lightColor = new ConstantProperty(Color.RED);
        left.darkColor = new ConstantProperty(Color.BLUE);
        left.offset = new ConstantProperty(10);
        left.repeat = new ConstantProperty(20);

        var right = new StripeMaterialProperty();
        right.horizontal = new ConstantProperty(false);
        right.lightColor = new ConstantProperty(Color.RED);
        right.darkColor = new ConstantProperty(Color.BLUE);
        right.offset = new ConstantProperty(10);
        right.repeat = new ConstantProperty(20);

        expect(left.equals(right)).toEqual(true);

        right.horizontal = new ConstantProperty(true);
        expect(left.equals(right)).toEqual(false);

        right.horizontal = new ConstantProperty(false);
        right.lightColor = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);

        right.lightColor = new ConstantProperty(Color.RED);
        right.darkColor = new ConstantProperty(Color.BLACK);
        expect(left.equals(right)).toEqual(false);

        right.darkColor = new ConstantProperty(Color.BLUE);
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
        testDefinitionChanged(property, 'horizontal', false, true);
        testDefinitionChanged(property, 'lightColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'darkColor', Color.RED, Color.BLUE);
        testDefinitionChanged(property, 'offset', 2, 5);
        testDefinitionChanged(property, 'repeat', 3, 4);
    });
});