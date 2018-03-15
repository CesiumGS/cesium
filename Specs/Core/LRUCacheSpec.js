defineSuite([
        'Core/LRUCache',
        'Core/getTimestamp'
    ], function(
        LRUCache,
        getTimestamp) {
    'use strict';

    it('can manipulate values', function() {
        var cache = new LRUCache();

        expect(cache.get('key1')).toBeUndefined();

        cache.set('key1', 1);
        cache.set('key2', 2);
        cache.set('key3', 3);

        expect(cache.get('key1')).toEqual(1);
        expect(cache.get('key2')).toEqual(2);
        expect(cache.get('key3')).toEqual(3);

        cache.set('key2', 4);
        expect(cache.get('key2')).toEqual(4);
    });

    it('set throws with undefined key', function() {
        var cache = new LRUCache();
        expect(function() {
            cache.set(undefined, 1);
        }).toThrowDeveloperError();
    });

    it('get throws with undefined key', function() {
        var cache = new LRUCache();
        expect(function() {
            cache.get(undefined);
        }).toThrowDeveloperError();
    });

    it('Overflows correctly when capacity is set', function() {
        var cache = new LRUCache(3);

        expect(cache.get('key1')).toBeUndefined();

        cache.set('key1', 1);
        cache.set('key2', 2);
        cache.set('key3', 3);

        expect(cache.get('key1')).toEqual(1); //[3, 2, 1]
        expect(cache.get('key2')).toEqual(2);
        expect(cache.get('key3')).toEqual(3);

        cache.set('key4', 4); //[4, 3, 2]
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toEqual(2);
        expect(cache.get('key3')).toEqual(3);
        expect(cache.get('key4')).toEqual(4);

        //set moves to the front of the list
        cache.set('key2', 22); //[2, 4, 3]
        expect(cache.get('key3')).toEqual(3);
        expect(cache.get('key2')).toEqual(22);
        expect(cache.get('key4')).toEqual(4);

        cache.set('key3', 3); //[3, 2, 4]
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toEqual(22);
        expect(cache.get('key3')).toEqual(3);
        expect(cache.get('key4')).toEqual(4);

        //get moves to the front of the list
        cache.get('key4'); //[4, 3, 2]
        cache.set('key1', 1); //[1, 3, 4]
        expect(cache.get('key1')).toEqual(1);
        expect(cache.get('key2')).toBeUndefined();
        expect(cache.get('key3')).toEqual(3);
        expect(cache.get('key4')).toEqual(4);
    });

    function spinWait(milliseconds) {
        var endTime = getTimestamp() + milliseconds;
        /*eslint-disable no-empty*/
        while (getTimestamp() < endTime) {
        }
        /*eslint-enable no-empty*/
    }

    it('prune has no effect when no expiration is set', function() {
        var cache = new LRUCache(3);
        cache.set('key1', 1);
        cache.set('key2', 2);
        cache.set('key3', 3);

        spinWait(3);

        LRUCache._prune(cache);

        expect(cache.get('key1')).toEqual(1);
        expect(cache.get('key2')).toEqual(2);
        expect(cache.get('key3')).toEqual(3);
    });

    it('prune removes expired entries', function() {
        spyOn(LRUCache, '_checkExpiration');

        var cache = new LRUCache(3, 10);
        cache.set('key1', 1);
        cache.set('key2', 2);

        spinWait(10);

        cache.set('key3', 3);

        LRUCache._prune(cache);

        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBeUndefined();
        expect(cache.get('key3')).toEqual(3);

        expect(cache._list.length).toBe(1);
    });
});
