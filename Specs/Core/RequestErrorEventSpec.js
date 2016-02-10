/*global defineSuite*/
defineSuite([
        'Core/RequestErrorEvent'
    ], function(
        RequestErrorEvent) {
    'use strict';

    it('parses response headers provided as a string', function() {
        var event = new RequestErrorEvent(404, 'foo', 'This-is-a-test: first\r\nAnother: second value!');
        expect(event.responseHeaders).toEqual({
            'This-is-a-test': 'first',
            'Another': 'second value!'
        });
    });

    it('leaves the response headers alone if they\'re already specified as an object literal', function() {
        var event = new RequestErrorEvent(404, 'foo', {
            'This-is-a-test': 'first',
            'Another': 'second value!'
        });
        expect(event.responseHeaders).toEqual({
            'This-is-a-test': 'first',
            'Another': 'second value!'
        });
    });
});
