describe("common/query", function() {
    var common = {query: require('common/query')};

    it('should exist', function() {
        expect(common.query).toBeDefined();
        expect(typeof common.query).toEqual("object");
    });

    it('should export a "toObject" function.', function() {
        expect(common.query.toObject).toBeDefined();
        expect(typeof common.query.toObject).toEqual("function");
    });

    it('The "toObject" function dumps an object from a query string.', function() {
        expect(common.query.toObject('name=Michael+Mathews')).toEqual({name: 'Michael Mathews'});
        expect(common.query.toObject('name=Michael+Mathews&city=London')).toEqual({name: 'Michael Mathews', city: 'London'});
    });
});