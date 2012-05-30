describe("quoted names", function() {

    describe("when found in square brackets", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/quotename.js'),
            found1 = docSet.getByLongname('chat.\"#channel\".open')[0];


        it('should have correct name and memberof', function() {
            expect(found1.name).toEqual('open');
            expect(found1.memberof).toEqual('chat.\"#channel\"');
        });
    });

    describe("when found in an object literal", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/quotename2.js'),
            found1 = docSet.getByLongname("contacts.\"say-\\\"hello\\\"@example.com\".username")[0];

        it('should have correct name and memberof', function() {
            expect(found1.name).toEqual('username');
            expect(found1.memberof).toEqual("contacts.\"say-\\\"hello\\\"@example.com\"");
        });
    });
});