describe("@param tag", function() {
    var docSet = jasmine.getDocSetFromFile('test/fixtures/paramtag.js'),
        find = docSet.getByLongname('find')[0],
        unbind = docSet.getByLongname('unbind')[0],
        bind = docSet.getByLongname('bind')[0],
        getElement = docSet.getByLongname('getElement')[0],
        combine = docSet.getByLongname('combine')[0],
        split = docSet.getByLongname('split')[0],
        commit = docSet.getByLongname('commit')[0];

    it('When a symbol has an @param tag with a type before the name, the doclet has a params property that includes that param.', function() {
        expect(typeof find.params).toEqual('object');
        expect(find.params.length).toEqual(1);
        expect(find.params[0].type.names.join(', ')).toEqual('String, Array<String>');
        expect(find.params[0].name).toEqual('targetName');
        expect(find.params[0].description).toEqual('The name (or names) of what to find.');
    });

    it('When a symbol has an @param tag with only a type and name, the doclet has a params property that includes that param.', function() {
        expect(typeof bind.params).toEqual('object');
        expect(bind.params.length).toEqual(1);
        expect(bind.params[0].type.names.join(', ')).toEqual('function');
        expect(bind.params[0].name).toEqual('callback');
        expect(bind.params[0].description).toBeUndefined();
    });

    it('When a symbol has an @param tag with only a type, the doclet has a params property that includes that param.', function() {
        expect(typeof unbind.params).toEqual('object');
        expect(unbind.params.length).toEqual(1);
        expect(unbind.params[0].type.names.join(', ')).toEqual('function');
        expect(unbind.params[0].description).toBeUndefined();
    });

    it('When a symbol has an @param tag with no type, the doclet has a params property that includes that param.', function() {
        expect(typeof getElement.params).toEqual('object');
        expect(getElement.params.length).toEqual(1);
        expect(getElement.params[0].type).toBeUndefined();
        expect(getElement.params[0].name).toEqual('id');
        expect(getElement.params[0].description).toEqual('The id of the element.');
    });

    it('When a symbol has an @param tag with a non-alpha name like "...", the doclet has a params property that includes that param.', function() {
        expect(typeof combine.params).toEqual('object');
        expect(combine.params.length).toEqual(1);
        expect(combine.params[0].type).toBeUndefined();
        expect(combine.params[0].name).toEqual('...');
        expect(combine.params[0].description).toEqual('Two or more elements.');
    });

    it('When a symbol has an @param tag with name followed by a dash, the doclet has a params property that includes that param.', function() {
        expect(typeof split.params).toEqual('object');
        expect(split.params.length).toEqual(1);
        expect(split.params[0].type).toBeUndefined();
        expect(split.params[0].name).toEqual('delimiter');
        expect(split.params[0].description).toEqual('What to split on.');
    });

    it('When a symbol has an @param tag with no name or type, the doclet has a params property that includes that param.', function() {
        expect(typeof commit.params).toEqual('object');
        expect(commit.params.length).toEqual(1);
        expect(commit.params[0].type).toBeUndefined();
        expect(commit.params[0].description).toEqual('If true make the commit atomic.');
    });

    it('When a symbol has an @param tag with no name and a name is given in the code, the doclet has a params property that includes that param with the name from the code.', function() {
        expect(commit.params[0].name).toEqual('atomic');
    });
});