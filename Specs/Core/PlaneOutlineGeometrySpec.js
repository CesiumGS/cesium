defineSuite([
        'Core/PlaneOutlineGeometry',
        'Core/Cartesian3',
        'Specs/createPackableSpecs'
    ], function(
        PlaneOutlineGeometry,
        Cartesian3,
        createPackableSpecs) {
    'use strict';

    it('constructor creates positions', function() {
        var m = PlaneOutlineGeometry.createGeometry(new PlaneOutlineGeometry());

        expect(m.attributes.position.values.length).toEqual(4 * 3);
        expect(m.indices.length).toEqual(4 * 2);
    });

    createPackableSpecs(PlaneOutlineGeometry, new PlaneOutlineGeometry(), []);
});
