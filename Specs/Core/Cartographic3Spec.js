/*global defineSuite*/
defineSuite([
         'Core/Cartographic3',
         'Core/Cartographic2'
     ], function(
         Cartographic3,
         Cartographic2) {
    "use strict";
    /*global it,expect*/

    it('construct0', function() {
        var c = new Cartographic3();
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
        expect(c.height).toEqual(0);
    });

    it('construct1', function() {
        var c = new Cartographic3(new Cartographic2(1, 2));
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
        expect(c.height).toEqual(0);
    });

    it('construct2', function() {
        var c = new Cartographic3(1, 2);
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
        expect(c.height).toEqual(0);
    });

    it('construct3', function() {
        var c = new Cartographic3(1, 2, 3);
        expect(c.longitude).toEqual(1);
        expect(c.latitude).toEqual(2);
        expect(c.height).toEqual(3);
    });

    it('getZero', function() {
        var c = Cartographic3.ZERO;
        expect(c.longitude).toEqual(0);
        expect(c.latitude).toEqual(0);
        expect(c.height).toEqual(0);
    });

    it('clones itself', function() {
        var c = new Cartographic3(0, 1, 2);
        var c2 = c.clone();
        expect(c.equals(c2)).toEqual(true);

        ++c2.height;
        expect(c.equals(c2)).toEqual(false);
    });

    it('equalsEpsilon', function() {
        expect(new Cartographic3(0, 2, 1).equalsEpsilon(new Cartographic3(0, 2, 1), 0)).toEqual(true);
        expect(new Cartographic3(0, 2, 1).equalsEpsilon(new Cartographic3(0, 2, 2), 1)).toEqual(true);
        expect(new Cartographic3(0, 2, 1).equalsEpsilon(new Cartographic3(0, 2, 3), 1)).toEqual(false);
    });

    it('toString', function() {
        var c = new Cartographic3(1, 2, 3);
        expect(c.toString()).toEqual('(1, 2, 3)');
    });
});
