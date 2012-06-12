describe("lends", function() {
    describe("when a documented member is inside an object literal associate with a @lends tag", function() {
        describe("standard case", function() {
            var docSet = jasmine.getDocSetFromFile('test/fixtures/lends.js'),
                init = docSet.getByLongname('Person#initialize'),
                name = docSet.getByLongname('Person#name');

            it("The member should be documented as a member of the lendee", function() {
                expect(init.length, 1);
            });

            it("The this member should be documented as a member of the lendee", function() {
                expect(name.length, 1);
            });
        });

        describe("case containg constructor", function() {
            var docSet = jasmine.getDocSetFromFile('test/fixtures/lends2.js'),
                person = docSet.getByLongname('Person').filter(function($) {
                    return ! $.undocumented;
                })[0],
                name = docSet.getByLongname('Person#name');

            it("A tag with a @constructs tag is documented as a constructor.", function() {
                expect(person.description).toEqual('Construct a Person.');
            });

            it("The member should be documented as a member of the lendee", function() {
                expect(person.length, 1);
            });

            it("The this member should be documented as a member of the lendee", function() {
                expect(name.length, 1);
            });
        });

    });

    describe("when a documented member is inside an objlit associated with a @lends tag that has no value.", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/lendsglobal.js'),
            testf = docSet.getByLongname('test')[0],
            test1 = docSet.getByLongname('test1')[0],
            test12 = docSet.getByLongname('test1.test2')[0];

        it("The members of the objlit are not members of any symbol", function() {
            expect(typeof testf.memberof).toEqual('undefined');
        });

        it("The members of the objlit are documented as global.", function() {
            expect(testf.longname).toEqual('test');
        });

        it("The nested members of the objlit are members of a global symbol", function() {
            expect(test12.memberof).toEqual('test1');
        });
    });
});