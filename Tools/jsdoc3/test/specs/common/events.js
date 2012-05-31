describe("common/events", function() {
    var common = {events: require('common/events')};

    it('should exist', function() {
        expect(common.events).toBeDefined();
        expect(typeof common.events).toEqual("object");
    });

    it('should export a "on" function.', function() {
        expect(common.events.on).toBeDefined();
        expect(typeof common.events.on).toEqual("function");
    });

    it('should export a "fire" function.', function() {
        expect(common.events.fire).toBeDefined();
        expect(typeof common.events.fire).toEqual("function");
    });

    it('should export a "removeListener" function.', function() {
        expect(common.events.removeListener).toBeDefined();
        expect(typeof common.events.removeListener).toEqual("function");
    });

    it('The "on" function attaches a handler to an object that can be fired.', function() {
        var target = {},
            result = false;

        target.on = common.events.on;
        target.fire = common.events.fire;

        target.on('test', function() { result = true; });
        target.fire('test');

        expect(result).toEqual(true);
    });
});