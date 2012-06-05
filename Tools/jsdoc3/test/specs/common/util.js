describe("common/util", function() {
    var common = {util: require('common/util')};

    it('should exist', function() {
        expect(common.util).toBeDefined();
        expect(typeof common.util).toEqual("object");
    });

    it('should export a "inherits" function.', function() {
        expect(common.util.inherits).toBeDefined();
        expect(typeof common.util.inherits).toEqual("function");
    });

    it('should export a "mixin" function.', function() {
        expect(common.util.mixin).toBeDefined();
        expect(typeof common.util.mixin).toEqual("function");
    });

    describe("common/util.mixin", function() {

        it('should take a target object and return it.', function() {
            var target = {a:1},
                returned;

            returned = common.util.mixin(target); // mixing nothing in

            expect(returned).toEqual(target);
        });

        it('it should mix a source object into the target.', function() {
            var target = {a: 1, b: 2},
                source = {c: 3};

            common.util.mixin(target, source); // modify the target object

            expect(target).toEqual({a: 1, b: 2, c: 3});
        });

        describe("overwriting properties in the target", function() {
            var target = {a: 1, b: 2},
            source = {b: 3, c: 4};

            common.util.mixin(target, source);

            it("should leave properties in the target with unique keys alone", function() {
                expect(target.a).toEqual(1);
            });

            it ('should overwrite existing properties in the target with same-named keys', function() {
                expect(target.b).toEqual(source.b);
            });

            it ('should add properties in the source with unique keys to the target', function() {
                expect(target.c).toEqual(source.c);
            });

        });

        describe("mixing several objects into the target", function() {
            var target = {},
                source1 = {a: 1, b: 2},
                source2 = {b: 7, c: 4},
                source3 = {b: 3, d: 5},
                returned;

            returned = common.util.mixin(target, source1, source2, source3); // use a dummy target and the return value to avoid modifying the real target (source1)

            it ('should not modify the source objects being mixed in', function() {
                expect(source1).toEqual({a: 1, b: 2});
            });

            it ('should return an object with the properties of all the sources', function() {
                expect(returned).toEqual({a: 1, b: 3, c: 4, d: 5});
            });
        });
    });
});