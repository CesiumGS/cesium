/*global defineSuite*/
defineSuite([
         'Core/CachePolicy',
         'Core/Cache'
     ], function(
         CachePolicy,
         Cache) {
    "use strict";
    /*global it,expect,describe,beforeEach*/

    describe('LRU', function() {
        var LRU = CachePolicy.LRU;

        var Key = function(value) {
            this.x = value;
            this.getKey = function() {
                return this.x.toString();
            };
        };

        var cache;
        var lastRemoved;
        var limit = 10;
        beforeEach(function() {
            lastRemoved = null;
            var fetch = function(key) {
                return {
                    twice : key.x * 2
                };
            };
            var remove = function(key) {
                lastRemoved = key;
            };
            cache = new Cache(new LRU({
                limit : limit,
                fetchFunc : fetch,
                removeFunc : remove
            }));
        });

        it('constructor throws on invalid fetch function', function() {
            expect(function() {
                return new LRU();
            }).toThrow();

            expect(function() {
                return new LRU({
                    fetchFunc : 'not-a-function'
                });
            }).toThrow();
        });

        it('hit is in cache', function() {
            var keys = [];
            var i = 0;
            for (; i < limit; ++i) {
                keys.push(new Key(i));
            }

            for (i = 0; i < 2 * limit; ++i) {
                var index = i % limit;
                expect(cache.find(keys[index]).twice).toEqual(2 * index);
            }

            // check that nothing was removed
            expect(lastRemoved === null).toEqual(true);
        });

        it('miss replaces lru', function() {
            var keys = [];
            var i = 0;
            for (; i < limit + 1; ++i) {
                keys.push(new Key(i));
            }

            var pause = function(ms) {
                var dummy = 0;
                ms += new Date().getTime();
                while (new Date() < ms) {
                    ++dummy;
                }
            };

            var length = keys.length;
            var iterations = length + (length / 2);
            for (i = 0; i < iterations; ++i) {
                var index = i % length;
                expect(cache.find(keys[index]).twice).toEqual(2 * index);
                pause(10);
            }

            // check lru was removed
            var lru = keys[(i + 1) % length];
            cache.find(keys[i % length]);
            expect(lastRemoved.x).toEqual(lru.x);
        });
    });
});
