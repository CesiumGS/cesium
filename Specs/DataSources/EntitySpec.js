/*global defineSuite*/
defineSuite([
        'DataSources/Entity',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'Core/Transforms',
        'DataSources/BillboardGraphics',
        'DataSources/BoxGraphics',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/CorridorGraphics',
        'DataSources/CylinderGraphics',
        'DataSources/EllipseGraphics',
        'DataSources/EllipsoidGraphics',
        'DataSources/LabelGraphics',
        'DataSources/ModelGraphics',
        'DataSources/PathGraphics',
        'DataSources/PointGraphics',
        'DataSources/PolygonGraphics',
        'DataSources/PolylineGraphics',
        'DataSources/PolylineVolumeGraphics',
        'DataSources/RectangleGraphics',
        'DataSources/WallGraphics'
    ], function(
        Entity,
        Cartesian3,
        JulianDate,
        Matrix3,
        Matrix4,
        Quaternion,
        TimeInterval,
        TimeIntervalCollection,
        Transforms,
        BillboardGraphics,
        BoxGraphics,
        ConstantPositionProperty,
        ConstantProperty,
        CorridorGraphics,
        CylinderGraphics,
        EllipseGraphics,
        EllipsoidGraphics,
        LabelGraphics,
        ModelGraphics,
        PathGraphics,
        PointGraphics,
        PolygonGraphics,
        PolylineGraphics,
        PolylineVolumeGraphics,
        RectangleGraphics,
        WallGraphics) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets expected properties.', function() {
        var entity = new Entity();
        expect(entity.id).toBeDefined();
        expect(entity.name).toBeUndefined();
        expect(entity.billboard).toBeUndefined();
        expect(entity.box).toBeUndefined();
        expect(entity.corridor).toBeUndefined();
        expect(entity.cylinder).toBeUndefined();
        expect(entity.description).toBeUndefined();
        expect(entity.ellipse).toBeUndefined();
        expect(entity.ellipsoid).toBeUndefined();
        expect(entity.label).toBeUndefined();
        expect(entity.model).toBeUndefined();
        expect(entity.orientation).toBeUndefined();
        expect(entity.path).toBeUndefined();
        expect(entity.point).toBeUndefined();
        expect(entity.polygon).toBeUndefined();
        expect(entity.polyline).toBeUndefined();
        expect(entity.polylineVolume).toBeUndefined();
        expect(entity.position).toBeUndefined();
        expect(entity.rectangle).toBeUndefined();
        expect(entity.viewFrom).toBeUndefined();
        expect(entity.wall).toBeUndefined();

        var options = {
            id : 'someId',
            name : 'bob',
            availability : new TimeIntervalCollection(),
            parent : new Entity(),
            customProperty : {},
            billboard : {},
            box : {},
            corridor : {},
            cylinder : {},
            description : 'description',
            ellipse : {},
            ellipsoid : {},
            label : {},
            model : {},
            orientation : new Quaternion(1, 2, 3, 4),
            path : {},
            point : {},
            polygon : {},
            polyline : {},
            polylineVolume : {},
            position : new Cartesian3(5, 6, 7),
            rectangle : {},
            viewFrom : new Cartesian3(8, 9, 10),
            wall : {}
        };

        entity = new Entity(options);
        expect(entity.id).toEqual(options.id);
        expect(entity.name).toEqual(options.name);
        expect(entity.availability).toBe(options.availability);
        expect(entity.parent).toBe(options.parent);
        expect(entity.customProperty).toBe(options.customProperty);

        expect(entity.billboard).toBeInstanceOf(BillboardGraphics);
        expect(entity.box).toBeInstanceOf(BoxGraphics);
        expect(entity.corridor).toBeInstanceOf(CorridorGraphics);
        expect(entity.cylinder).toBeInstanceOf(CylinderGraphics);
        expect(entity.description).toBeInstanceOf(ConstantProperty);
        expect(entity.ellipse).toBeInstanceOf(EllipseGraphics);
        expect(entity.ellipsoid).toBeInstanceOf(EllipsoidGraphics);
        expect(entity.label).toBeInstanceOf(LabelGraphics);
        expect(entity.model).toBeInstanceOf(ModelGraphics);
        expect(entity.orientation).toBeInstanceOf(ConstantProperty);
        expect(entity.path).toBeInstanceOf(PathGraphics);
        expect(entity.point).toBeInstanceOf(PointGraphics);
        expect(entity.polygon).toBeInstanceOf(PolygonGraphics);
        expect(entity.polyline).toBeInstanceOf(PolylineGraphics);
        expect(entity.polylineVolume).toBeInstanceOf(PolylineVolumeGraphics);
        expect(entity.position).toBeInstanceOf(ConstantPositionProperty);
        expect(entity.rectangle).toBeInstanceOf(RectangleGraphics);
        expect(entity.viewFrom).toBeInstanceOf(ConstantProperty);
        expect(entity.wall).toBeInstanceOf(WallGraphics);
    });

    it('isAvailable is always true if no availability defined.', function() {
        var entity = new Entity();
        expect(entity.isAvailable(JulianDate.now())).toEqual(true);
    });

    it('isAvailable throw if no time specified.', function() {
        var entity = new Entity();
        expect(function() {
            entity.isAvailable();
        }).toThrowDeveloperError();
    });

    it('constructor creates a unique id if one is not provided.', function() {
        var object = new Entity();
        var object2 = new Entity();
        expect(object.id).toBeDefined();
        expect(object.id).toNotEqual(object2.id);
    });

    it('isAvailable works.', function() {
        var entity = new Entity();
        var interval = TimeInterval.fromIso8601({
            iso8601 : '2000-01-01/2001-01-01'
        });
        var intervals = new TimeIntervalCollection();
        intervals.addInterval(interval);
        entity.availability = intervals;
        expect(entity.isAvailable(JulianDate.addSeconds(interval.start, -1, new JulianDate()))).toEqual(false);
        expect(entity.isAvailable(interval.start)).toEqual(true);
        expect(entity.isAvailable(interval.stop)).toEqual(true);
        expect(entity.isAvailable(JulianDate.addSeconds(interval.stop, 1, new JulianDate()))).toEqual(false);
    });

    it('definitionChanged works for all properties', function() {
        var entity = new Entity();
        var propertyNames = entity.propertyNames;
        var propertyNamesLength = propertyNames.length;

        var listener = jasmine.createSpy('listener');
        entity.definitionChanged.addEventListener(listener);

        var i;
        var name;
        var newValue;
        var oldValue;
        //We loop through twice to ensure that oldValue is properly passed in.
        for (var x = 0; x < 2; x++) {
            for (i = 0; i < propertyNamesLength; i++) {
                name = propertyNames[i];
                newValue = new ConstantProperty(1);
                oldValue = entity[propertyNames[i]];
                entity[name] = newValue;
                expect(listener).toHaveBeenCalledWith(entity, name, newValue, oldValue);
            }
        }
    });

    it('merge always overwrites availability', function() {
        var entity = new Entity();
        var interval = TimeInterval.fromIso8601({
            iso8601 : '2000-01-01/2001-01-01'
        });
        entity.availability = interval;

        var entity2 = new Entity();
        var interval2 = TimeInterval.fromIso8601({
            iso8601 : '2000-01-01/2001-01-01'
        });
        entity2.availability = interval2;

        entity.merge(entity2);
        expect(entity.availability).toBe(interval2);
    });

    it('merge works with custom properties.', function() {
        var propertyName = 'customProperty';
        var value = 'fizzbuzz';

        var source = new Entity({
            id : 'source'
        });
        source.addProperty(propertyName);
        source[propertyName] = value;

        var listener = jasmine.createSpy('listener');

        var target = new Entity({
            id : 'target'
        });

        //Merging should actually call addProperty for the customProperty.
        spyOn(target, 'addProperty').andCallThrough();
        target.merge(source);

        expect(target.addProperty).toHaveBeenCalledWith(propertyName);
        expect(target[propertyName]).toEqual(source[propertyName]);
    });

    it('merge throws with undefined source', function() {
        var entity = new Entity();
        expect(function() {
            entity.merge(undefined);
        }).toThrowDeveloperError();
    });

    it('_getModelMatrix returns undefined when position is undefined.', function() {
        var entity = new Entity();
        entity.orientation = new ConstantProperty(Quaternion.IDENTITY);
        expect(entity._getModelMatrix(new JulianDate())).toBeUndefined();
    });

    it('_getModelMatrix returns correct value.', function() {
        var entity = new Entity();

        var position = new Cartesian3(123456, 654321, 123456);
        var orientation = new Quaternion(1, 2, 3, 4);
        Quaternion.normalize(orientation, orientation);

        entity.position = new ConstantProperty(position);
        entity.orientation = new ConstantProperty(orientation);

        var modelMatrix = entity._getModelMatrix(new JulianDate());
        var expected = Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(orientation), position);
        expect(modelMatrix).toEqual(expected);
    });

    it('_getModelMatrix returns ENU when quaternion is undefined.', function() {
        var entity = new Entity();
        var position = new Cartesian3(123456, 654321, 123456);
        entity.position = new ConstantProperty(position);

        var modelMatrix = entity._getModelMatrix(new JulianDate());
        var expected = Transforms.eastNorthUpToFixedFrame(position);
        expect(modelMatrix).toEqual(expected);
    });

    it('_getModelMatrix works with result parameter.', function() {
        var entity = new Entity();
        var position = new Cartesian3(123456, 654321, 123456);
        entity.position = new ConstantProperty(position);

        var result = new Matrix4();
        var modelMatrix = entity._getModelMatrix(new JulianDate(), result);
        var expected = Transforms.eastNorthUpToFixedFrame(position);
        expect(modelMatrix).toBe(result);
        expect(modelMatrix).toEqual(expected);
    });

    it('can add and remove custom properties.', function() {
        var entity = new Entity();
        expect(entity.hasOwnProperty('bob')).toBe(false);
        entity.addProperty('bob');
        expect(entity.hasOwnProperty('bob')).toBe(true);
        entity.removeProperty('bob');
        expect(entity.hasOwnProperty('bob')).toBe(false);
    });

    it('addProperty throws with no property specified.', function() {
        var entity = new Entity();
        expect(function() {
            entity.addProperty(undefined);
        }).toThrowDeveloperError();
    });

    it('addProperty throws with no property specified.', function() {
        var entity = new Entity();
        expect(function() {
            entity.addProperty(undefined);
        }).toThrowDeveloperError();
    });

    it('removeProperty throws with no property specified.', function() {
        var entity = new Entity();
        expect(function() {
            entity.removeProperty(undefined);
        }).toThrowDeveloperError();
    });

    it('addProperty throws when adding an existing property.', function() {
        var entity = new Entity();
        entity.addProperty('bob');
        expect(function() {
            entity.addProperty('bob');
        }).toThrowDeveloperError();
    });

    it('removeProperty throws when non-existent property.', function() {
        var entity = new Entity();
        expect(function() {
            entity.removeProperty('bob');
        }).toThrowDeveloperError();
    });

    it('addProperty throws with defined reserved property name.', function() {
        var entity = new Entity();
        expect(function() {
            entity.addProperty('merge');
        }).toThrowDeveloperError();
    });

    it('removeProperty throws with defined reserved property name.', function() {
        var entity = new Entity();
        expect(function() {
            entity.removeProperty('merge');
        }).toThrowDeveloperError();
    });

    it('addProperty throws with undefined reserved property name.', function() {
        var entity = new Entity();
        expect(entity.name).toBeUndefined();
        expect(function() {
            entity.addProperty('name');
        }).toThrowDeveloperError();
    });

    it('removeProperty throws with undefined reserved property name.', function() {
        var entity = new Entity();
        expect(entity.name).toBeUndefined();
        expect(function() {
            entity.removeProperty('name');
        }).toThrowDeveloperError();
    });
});