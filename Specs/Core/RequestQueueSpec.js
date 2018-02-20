defineSuite([
        'Core/RequestQueue',
        'Core/Math',
        'Core/Request'
    ], function(
        RequestQueue,
        CesiumMath,
        Request) {
    'use strict';

    var length = 20;

    function createRequest(distance) {
        return new Request({
            priority : distance
        });
    }

    function isSorted(queue) {
        var distance = Number.NEGATIVE_INFINITY;
        for (var i = 0; i < queue.length; ++i) {
            var requestDistance = queue.get(i).priority;
            if (requestDistance < distance) {
                return false;
            }

            distance = requestDistance;
        }
        return true;
    }

    it('sets initial values', function() {
        var queue = new RequestQueue(length);
        expect(queue._array.length).toBe(length);
        expect(queue._length).toBe(0);
        expect(queue._maximumLength).toBe(length);
    });

    it('gets length', function() {
        var queue = new RequestQueue(length);
        expect(queue.length).toBe(0);
        queue.insert(createRequest(1.0));
        expect(queue.length).toBe(1);
    });

    it('get', function() {
        var queue = new RequestQueue(length);
        queue.insert(createRequest(1));
        queue.insert(createRequest(0));
        expect(queue.get(0).priority).toBe(0);
        expect(queue.get(1).priority).toBe(1);
    });

    it('insert', function() {
        var removedRequest;
        var request;
        var i;

        CesiumMath.setRandomNumberSeed(0.0);
        var distances = new Array(length);
        for (i = 0; i < length; ++i) {
            distances[i] = CesiumMath.nextRandomNumber();
        }
        distances.sort();
        var lowestDistance = distances[0];
        var highestDistance = distances[distances.length - 1];

        var queue = new RequestQueue(length);
        for (i = 0; i < length; ++i) {
            removedRequest = queue.insert(createRequest(distances[i]));
            expect(removedRequest).toBeUndefined(); // Requests are not removed until the queue is full
        }

        expect(isSorted(queue)).toBe(true);

        request = createRequest(highestDistance);
        expect(queue.insert(request)).toBe(request);

        request = createRequest(highestDistance + 1.0);
        expect(queue.insert(request)).toBe(request);

        request = createRequest(lowestDistance);
        expect(queue.insert(request).priority).toBe(highestDistance);
        expect(queue.get(0).priority).toBe(lowestDistance);
        expect(queue.get(1).priority).toBe(lowestDistance);
        expect(queue.get(2).priority).toBeGreaterThan(lowestDistance);

        expect(isSorted(queue)).toBe(true);
    });

    it('forEach', function() {
        var total = 0;
        var queue = new RequestQueue(length);
        for (var i = 0; i < length; ++i) {
            queue.insert(createRequest(1));
        }
        queue.forEach(function(request) {
            total += request.priority;
        });
        expect(total).toBe(length);
    });

    it('sort', function() {
        var i;
        CesiumMath.setRandomNumberSeed(0.0);
        var queue = new RequestQueue(length);
        for (i = 0; i < length / 2; ++i) {
            queue.insert(createRequest(CesiumMath.nextRandomNumber()));
        }
        queue.forEach(function(request) {
            request.priority = CesiumMath.nextRandomNumber();
        });
        expect(isSorted(queue)).toBe(false);
        queue.sort();
        expect(isSorted(queue)).toBe(true);
    });

    it('remove', function() {
        var queue = new RequestQueue(length);
        for (var i = 0; i < length; ++i) {
            queue.insert(createRequest(i));
        }
        queue.remove(0);
        expect(queue.get(0).priority).toBe(0);
        expect(queue.get(1).priority).toBe(1);
        expect(queue.length).toBe(length);

        queue.remove(1);
        expect(queue.get(0).priority).toBe(1);
        expect(queue.get(1).priority).toBe(2);
        expect(queue.length).toBe(length - 1);

        queue.remove(2);
        expect(queue.get(0).priority).toBe(3);
        expect(queue.get(1).priority).toBe(4);
        expect(queue.length).toBe(length - 3);

        queue.remove(17);
        expect(queue.length).toBe(0);
    });

    it('throws if maximumLength is undefined', function() {
        expect(function() {
            return new RequestQueue();
        }).toThrowDeveloperError();
    });

    it('throws if get index is out of range', function() {
        expect(function() {
            var queue = new RequestQueue(length);
            queue.get(0);
        }).toThrowDeveloperError();

        expect(function() {
            var queue = new RequestQueue(length);
            queue.insert(createRequest(0.0));
            queue.get(1);
        }).toThrowDeveloperError();

        expect(function() {
            var queue = new RequestQueue(length);
            queue.insert(createRequest(0.0));
            queue.get(-1);
        }).toThrowDeveloperError();
    });

    it('throws if forEach callback is not a function', function() {
        expect(function() {
            var queue = new RequestQueue(length);
            queue.forEach();
        }).toThrowDeveloperError();
        expect(function() {
            var queue = new RequestQueue(length);
            queue.forEach(5);
        }).toThrowDeveloperError();
    });

    it('throws if remove length is out of range', function() {
        expect(function() {
            var queue = new RequestQueue(length);
            queue.remove(1);
        }).toThrowDeveloperError();

        expect(function() {
            var queue = new RequestQueue(length);
            queue.remove(-1);
        }).toThrowDeveloperError();
    });
});
