/*global defineSuite*/
defineSuite([
        'DataSources/DataSourceCollection',
        'Specs/MockDataSource'
    ], function(
        DataSourceCollection,
        MockDataSource) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('contains, get, getLength, and indexOf work', function() {
        var collection = new DataSourceCollection();
        var source = new MockDataSource();

        expect(collection.length).toEqual(0);
        expect(collection.contains(source)).toEqual(false);

        collection.add(new MockDataSource());
        collection.add(source);
        collection.add(new MockDataSource());

        expect(collection.length).toEqual(3);
        expect(collection.get(1)).toBe(source);
        expect(collection.indexOf(source)).toEqual(1);
        expect(collection.contains(source)).toEqual(true);

        collection.remove(collection.get(0));
        expect(collection.indexOf(source)).toEqual(0);

        expect(collection.remove(source)).toEqual(true);
        expect(collection.contains(source)).toEqual(false);
    });

    it('add and remove events work', function() {
        var source = new MockDataSource();
        var collection = new DataSourceCollection();

        var addCalled = 0;
        collection.dataSourceAdded.addEventListener(function(sender, dataSource) {
            addCalled++;
            expect(sender).toBe(collection);
            expect(dataSource).toBe(source);
        });

        var removeCalled = 0;
        collection.dataSourceRemoved.addEventListener(function(sender, dataSource) {
            removeCalled++;
            expect(sender).toBe(collection);
            expect(dataSource).toBe(source);
        });

        collection.add(source);
        expect(addCalled).toEqual(1);
        expect(removeCalled).toEqual(0);

        expect(collection.remove(source)).toEqual(true);
        expect(addCalled).toEqual(1);
        expect(removeCalled).toEqual(1);
    });

    it('removeAll triggers events', function() {
        var sources = [new MockDataSource(), new MockDataSource(), new MockDataSource()];
        var collection = new DataSourceCollection();

        var removeCalled = 0;
        collection.dataSourceRemoved.addEventListener(function(sender, dataSource) {
            expect(sender).toBe(collection);
            expect(sources.indexOf(dataSource)).toNotEqual(-1);
            removeCalled++;
        });

        collection.add(sources[0]);
        collection.add(sources[1]);
        collection.add(sources[2]);
        collection.removeAll();

        expect(collection.length).toEqual(0);
        expect(removeCalled).toEqual(sources.length);
    });

    it('destroy triggers remove events and calls destroy', function() {
        var sources = [new MockDataSource(), new MockDataSource(), new MockDataSource()];
        var collection = new DataSourceCollection();

        var removeCalled = 0;
        collection.dataSourceRemoved.addEventListener(function(sender, dataSource) {
            expect(sender).toBe(collection);
            expect(sources.indexOf(dataSource)).toNotEqual(-1);
            removeCalled++;
        });

        collection.add(sources[0]);
        collection.add(sources[1]);
        collection.add(sources[2]);

        expect(collection.isDestroyed()).toEqual(false);
        collection.destroy();
        expect(collection.isDestroyed()).toEqual(true);
        expect(removeCalled).toEqual(sources.length);
        expect(sources[0].destroyed).toEqual(true);
        expect(sources[1].destroyed).toEqual(true);
        expect(sources[2].destroyed).toEqual(true);
    });

    it('remove returns fals for non-member', function() {
        var collection = new DataSourceCollection();
        expect(collection.remove(new MockDataSource())).toEqual(false);
    });

    it('get throws if passed undefined', function() {
        var collection = new DataSourceCollection();
        expect(function(){
            collection.get(undefined);
        }).toThrowDeveloperError();
    });

    it('add throws if passed undefined', function() {
        var collection = new DataSourceCollection();
        expect(function(){
            collection.add(undefined);
        }).toThrowDeveloperError();
    });
});
