defineSuite([
        'Core/parseResponseHeaders'
    ], function(
        parseResponseHeaders) {
    'use strict';

    it('returns an empty object literal when given falsy input', function() {
        expect(parseResponseHeaders()).toEqual({});
        expect(parseResponseHeaders(null)).toEqual({});
        expect(parseResponseHeaders('')).toEqual({});
    });

    it('correctly parses response headers', function() {
        var headerString =
            'Date: Sun, 24 Oct 2004 04:58:38 GMT\r\n' +
            'Server: Apache/1.3.31 (Unix)\r\n' +
            'Keep-Alive: timeout=15, max=99\r\n' +
            'Connection: Keep-Alive\r\n' +
            'Transfer-Encoding: chunked\r\n' +
            'Content-Type: text/plain; charset=utf-8';
        expect(parseResponseHeaders(headerString)).toEqual({
            Date: 'Sun, 24 Oct 2004 04:58:38 GMT',
            Server: 'Apache/1.3.31 (Unix)',
            'Keep-Alive': 'timeout=15, max=99',
            Connection: 'Keep-Alive',
            'Transfer-Encoding': 'chunked',
            'Content-Type': 'text/plain; charset=utf-8'
        });
    });
});
