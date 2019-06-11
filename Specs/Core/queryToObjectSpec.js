defineSuite([
        'Core/queryToObject'
    ], function(
        queryToObject) {
    'use strict';

    it('can decode data', function() {
        var str = 'key1=some%20value&key2=a%2Fb';
        var obj = queryToObject(str);

        expect(obj).toEqual({
            key1 : 'some value',
            key2 : 'a/b'
        });

        str = 'spec=Core%2FobjectToQuery%20can%20encode%20data.&debug=Core%2FobjectToQuery%20can%20encode%20data.';
        obj = queryToObject(str);

        expect(obj).toEqual({
            spec : 'Core/objectToQuery can encode data.',
            debug : 'Core/objectToQuery can encode data.'
        });

        str = 'q=query+string';
        obj = queryToObject(str);

        expect(obj).toEqual({
            q : 'query string'
        });
    });

    it('can decode arrays of data', function() {
        var str = 'key=a&key=b';
        var obj = queryToObject(str);

        expect(obj).toEqual({
            key : ['a', 'b']
        });
    });

    it('can use ; instead of &', function() {
        var str = 'key=a;key=b;key2=c';
        var obj = queryToObject(str);

        expect(obj).toEqual({
            key : ['a', 'b'],
            key2 : 'c'
        });
    });

    it('can decode blank', function() {
        expect(queryToObject('')).toEqual({});
    });

    it('requires queryString', function() {
        expect(function() {
            queryToObject();
        }).toThrowDeveloperError();
    });
});
