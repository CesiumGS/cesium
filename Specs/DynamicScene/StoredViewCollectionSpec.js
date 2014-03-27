/*global defineSuite*/
defineSuite([
         'DynamicScene/StoredViewCollection',
         'DynamicScene/StoredView'
     ], function(
         StoredViewCollection,
         StoredView) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var CollectionListener = function() {
        this.timesCalled = 0;
        this.added = undefined;
        this.removed = undefined;
    };

    CollectionListener.prototype.onCollectionChanged = function(collection, added, removed) {
        this.timesCalled++;
        this.added = added.slice(0);
        this.removed = removed.slice(0);
    };

    it('constructor has expected defaults', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(storedViewCollection.getStoredViews().length).toEqual(0);
    });

    it('add/remove works', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedViewCollection = new StoredViewCollection();

        storedViewCollection.add(storedView);
        expect(storedViewCollection.getStoredViews().length).toEqual(1);

        storedViewCollection.add(storedView2);
        expect(storedViewCollection.getStoredViews().length).toEqual(2);

        storedViewCollection.remove(storedView2);
        expect(storedViewCollection.getStoredViews().length).toEqual(1);

        storedViewCollection.remove(storedView);
        expect(storedViewCollection.getStoredViews().length).toEqual(0);
    });

    it('add/remove raises expected events', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedViewCollection = new StoredViewCollection();

        var listener = new CollectionListener();
        storedViewCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        storedViewCollection.add(storedView);
        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(storedView);
        expect(listener.removed.length).toEqual(0);

        storedViewCollection.add(storedView2);
        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(storedView2);
        expect(listener.removed.length).toEqual(0);

        storedViewCollection.remove(storedView2);
        expect(listener.timesCalled).toEqual(3);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(storedView2);

        storedViewCollection.remove(storedView);
        expect(listener.timesCalled).toEqual(4);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(storedView);

        storedViewCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended add/remove raises expected events', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedView3 = new StoredView();

        var storedViewCollection = new StoredViewCollection();

        var listener = new CollectionListener();
        storedViewCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        storedViewCollection.suspendEvents();
        storedViewCollection.suspendEvents();
        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView2);
        storedViewCollection.add(storedView3);
        storedViewCollection.remove(storedView2);

        expect(listener.timesCalled).toEqual(0);
        storedViewCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(0);
        storedViewCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(2);
        expect(listener.added[0]).toBe(storedView);
        expect(listener.added[1]).toBe(storedView3);
        expect(listener.removed.length).toEqual(0);

        storedViewCollection.suspendEvents();
        storedViewCollection.remove(storedView);
        storedViewCollection.remove(storedView3);
        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView3);
        storedViewCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(1);

        storedViewCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeAll works', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedViewCollection = new StoredViewCollection();

        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView2);
        storedViewCollection.removeAll();
        expect(storedViewCollection.getStoredViews().length).toEqual(0);
    });

    it('removeAll raises expected events', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedViewCollection = new StoredViewCollection();

        var listener = new CollectionListener();

        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView2);

        storedViewCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);
        storedViewCollection.removeAll();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(storedView);
        expect(listener.removed[1]).toBe(storedView2);
        expect(listener.added.length).toEqual(0);

        storedViewCollection.removeAll();
        expect(listener.timesCalled).toEqual(1);

        storedViewCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended removeAll raises expected events', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedViewCollection = new StoredViewCollection();

        var listener = new CollectionListener();

        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView2);

        storedViewCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        storedViewCollection.suspendEvents();
        storedViewCollection.removeAll();
        storedViewCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(storedView);
        expect(listener.removed[1]).toBe(storedView2);
        expect(listener.added.length).toEqual(0);

        storedViewCollection.suspendEvents();
        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView2);
        storedViewCollection.remove(storedView2);
        storedViewCollection.removeAll();
        storedViewCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);

        storedViewCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('getById works', function() {
        var storedView = new StoredView();
        var storedView2 = new StoredView();
        var storedViewCollection = new StoredViewCollection();

        storedViewCollection.add(storedView);
        storedViewCollection.add(storedView2);

        expect(storedViewCollection.getById(storedView.id)).toBe(storedView);
        expect(storedViewCollection.getById(storedView2.id)).toBe(storedView2);
    });

    it('getById returns undefined for non-existent storedView', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(storedViewCollection.getById('123')).toBeUndefined();
    });

    it('resumeEvents throws if no matching suspendEvents ', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(function() {
            storedViewCollection.resumeEvents();
        }).toThrowDeveloperError();
    });

    it('add throws with undefined StoredView', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(function() {
            storedViewCollection.add(undefined);
        }).toThrowDeveloperError();
    });

    it('add throws for StoredView with same id', function() {
        var storedViewCollection = new StoredViewCollection();
        var storedView = new StoredView('1');
        var storedView2 = new StoredView('1');
        storedViewCollection.add(storedView);

        expect(function() {
            storedViewCollection.add(storedView2);
        }).toThrow();
    });

    it('remove throws with undefined StoredView', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(function() {
            storedViewCollection.remove(undefined);
        }).toThrowDeveloperError();
    });

    it('removeById throws for undefined id', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(function() {
            storedViewCollection.removeById(undefined);
        }).toThrowDeveloperError();
    });

    it('getById throws if no id specified', function() {
        var storedViewCollection = new StoredViewCollection();
        expect(function() {
            storedViewCollection.getById(undefined);
        }).toThrowDeveloperError();
    });
});
