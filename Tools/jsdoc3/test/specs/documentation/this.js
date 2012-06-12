describe("this", function() {
    describe("attaching members to 'this'", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/this.js'),
            found1 = docSet.getByLongname('Singer#tralala'),
            found2 = docSet.getByLongname('Singer#isSinging');

        describe("in a contructor", function() {
            it("should have a longname like Constructor#member", function() {
                expect(found1.length).toEqual(1);
            });

            it("should havea correct short name", function() {
                expect(found1[0].name).toEqual('tralala');
            });

            it("should havea correct memberof", function() {
                expect(found1[0].memberof).toEqual('Singer');
            });

            it("should default to a 'instance' scope", function() {
                expect(found1[0].scope).toEqual('instance');
            });
        });

        describe("in a method of a constructor", function() {
            it("should have a longname like Constructor#member", function() {
                expect(found2.length).toEqual(1);
            });

            it("should havea correct short name", function() {
                expect(found2[0].name).toEqual('isSinging');
            });

            it("should havea correct memberof", function() {
                expect(found2[0].memberof).toEqual('Singer');
            });

            it("should default to a 'instance' scope", function() {
                expect(found2[0].scope).toEqual('instance');
            });
        });
    });

    describe("when a contructor is nested inside another constructor", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/this2.js'),
            found = docSet.getByLongname('TemplateBuilder#Template#rendered');

        it("should have a longname like Constructor#Constructor#member", function() {
            expect(found.length).toEqual(1);
        });

        it("should havea correct short name", function() {
            expect(found[0].name).toEqual('rendered');
        });

        it("should havea correct memberof", function() {
            expect(found[0].memberof).toEqual('TemplateBuilder#Template');
        });

        it("should default to a 'instance' scope", function() {
            expect(found[0].scope).toEqual('instance');
        });
    });

    describe("When a this is assigned to inside a non-constructor function", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/this3.js'),
            found = docSet.getByLongname('position');

        it("should have a global member name like 'member'", function() {
            expect(found.length).toEqual(1);
        });

        it("should havea correct short name", function() {
            expect(found[0].name).toEqual('position');
        });

        it("should havea correct memberof", function() {
            expect(found[0].memberof).toBeUndefined();
        });
    });

    describe("When a member is nested inside an objectlit 'this' property inside a constructor", function() {
        var docSet = jasmine.getDocSetFromFile('test/fixtures/this-and-objectlit.js'),
            found = docSet.getByLongname('Page#parts.body.heading');

        it("should have a longname like Constructor#objlit.member", function() {
            expect(found.length).toEqual(1);
        });

        it("should havea correct short name", function() {
            expect(found[0].name).toEqual('heading');
        });

        it("should havea correct memberof", function() {
            expect(found[0].memberof).toEqual('Page#parts.body');
        });

        it("should default to a 'static' scope", function() {
            expect(found[0].scope).toEqual('static');
        });
    });
});