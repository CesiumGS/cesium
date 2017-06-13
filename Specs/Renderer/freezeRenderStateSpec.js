/*global defineSuite*/
defineSuite([
        'Renderer/freezeRenderState'
      ], function(
          freezeRenderState) {
    'use strict';

    it('works for literals', function() {
        var fresh = {
            a: 1,
            b: 'b',
            c: 2.2,
            u: undefined,
            n: null
        };

        var frozen = freezeRenderState(fresh);

        expect(function() {
            frozen.a = 2;
        }).toThrow();

        expect(function() {
            frozen.b = 'c';
        }).toThrow();

        expect(function() {
            frozen.c = 2;
        }).toThrow();

    });

    it('works for deep objects', function() {
        var fresh = {
            a: 2,
            o: {
                b: 2,
                c: 'c'
            }
        };

        var frozen = freezeRenderState(fresh);

        expect(function() {
            frozen.o.b = 3;
            frozen.o.c = 'dddd';
        }).toThrow();
    });

    it('ignores _applyFunctions', function() {
        var fresh = {
            a: 1,
            _applyFunctions: [function() { }]
        };

        var frozen = freezeRenderState(fresh);

        expect(function() {
            frozen.a = 0;
        }).toThrow();

        expect(function() {
            frozen._applyFunctions.push(function() { });
        }).not.toThrow();
    });

});
