import { DataSourceCollection, defer } from "../../Source/Cesium.js";
import MockDataSource from "../MockDataSource.js";

describe("DataSources/DataSourceCollection", function () {
  it("contains, get, getLength, and indexOf work", function () {
    const collection = new DataSourceCollection();
    const source = new MockDataSource();

    expect(collection.length).toEqual(0);
    expect(collection.contains(source)).toEqual(false);

    return Promise.all([
      collection.add(new MockDataSource()),
      collection.add(source),
      collection.add(new MockDataSource()),
    ]).then(function () {
      expect(collection.length).toEqual(3);
      expect(collection.get(1)).toBe(source);
      expect(collection.indexOf(source)).toEqual(1);
      expect(collection.contains(source)).toEqual(true);

      collection.remove(collection.get(0));
      expect(collection.indexOf(source)).toEqual(0);

      expect(collection.remove(source)).toEqual(true);
      expect(collection.contains(source)).toEqual(false);
    });
  });

  it("getByName works", function () {
    const collection = new DataSourceCollection();
    const promises = [];
    const source1 = new MockDataSource();
    source1.name = "Name1";
    promises.push(collection.add(source1));

    const source2 = new MockDataSource();
    source2.name = "Name1";
    promises.push(collection.add(source2));

    const source3 = new MockDataSource();
    source3.name = "Name2";
    promises.push(collection.add(source3));

    return Promise.all(promises).then(function () {
      const res = collection.getByName("Name1");
      expect(res.length).toEqual(2);
      expect(res[0].name).toEqual("Name1");
      expect(res[1].name).toEqual("Name1");
    });
  });

  it("add and remove events work", function () {
    const source = new MockDataSource();
    const collection = new DataSourceCollection();

    const addSpy = jasmine.createSpy("dataSourceAdded");
    collection.dataSourceAdded.addEventListener(addSpy);

    const removeSpy = jasmine.createSpy("dataSourceRemoved");
    collection.dataSourceRemoved.addEventListener(removeSpy);

    return collection.add(source).then(function () {
      expect(addSpy).toHaveBeenCalledWith(collection, source);
      expect(removeSpy).not.toHaveBeenCalled();

      addSpy.calls.reset();
      removeSpy.calls.reset();

      expect(collection.remove(source)).toEqual(true);
      expect(addSpy).not.toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledWith(collection, source);
    });
  });

  it("move event works", function () {
    const source = new MockDataSource();
    const collection = new DataSourceCollection();
    const moveSpy = jasmine.createSpy("dataSourceMoved");
    collection.dataSourceMoved.addEventListener(moveSpy);
    return collection
      .add(source)
      .then(function () {
        collection.raise(source);
        collection.lower(source);
        collection.raiseToTop(source);
        collection.lowerToBottom(source);

        expect(moveSpy).not.toHaveBeenCalled();

        return Promise.all([
          collection.add(new MockDataSource()),
          collection.add(new MockDataSource()),
        ]);
      })
      .then(function () {
        collection.raise(source);
        expect(moveSpy).toHaveBeenCalledWith(source, 1, 0);

        collection.lower(source);
        expect(moveSpy).toHaveBeenCalledWith(source, 0, 1);

        collection.raiseToTop(source);
        expect(moveSpy).toHaveBeenCalledWith(source, 2, 0);

        collection.lowerToBottom(source);
        expect(moveSpy).toHaveBeenCalledWith(source, 0, 2);
      });
  });

  it("add works with promise", function () {
    const deferred = defer();
    const source = new MockDataSource();
    const collection = new DataSourceCollection();

    const addSpy = jasmine.createSpy("dataSourceAdded");
    collection.dataSourceAdded.addEventListener(addSpy);
    const promise = collection.add(deferred.promise);

    expect(collection.length).toEqual(0);
    expect(addSpy).not.toHaveBeenCalled();

    deferred.resolve(source);
    return promise.then(function () {
      expect(addSpy).toHaveBeenCalledWith(collection, source);
      expect(collection.length).toEqual(1);
    });
  });

  it("promise does not get added if not resolved before removeAll", function () {
    const deferred = defer();
    const source = new MockDataSource();
    const collection = new DataSourceCollection();

    const addSpy = jasmine.createSpy("dataSourceAdded");
    collection.dataSourceAdded.addEventListener(addSpy);
    const promise = collection.add(deferred.promise);
    expect(collection.length).toEqual(0);

    expect(addSpy).not.toHaveBeenCalled();
    collection.removeAll();

    deferred.resolve(source);
    return promise.then(function () {
      expect(addSpy).not.toHaveBeenCalled();
      expect(collection.length).toEqual(0);
    });
  });

  it("removeAll triggers events", function () {
    const sources = [
      new MockDataSource(),
      new MockDataSource(),
      new MockDataSource(),
    ];
    const collection = new DataSourceCollection();

    let removeCalled = 0;
    collection.dataSourceRemoved.addEventListener(function (
      sender,
      dataSource
    ) {
      expect(sender).toBe(collection);
      expect(sources.indexOf(dataSource)).not.toEqual(-1);
      removeCalled++;
    });

    return Promise.all([
      collection.add(sources[0]),
      collection.add(sources[1]),
      collection.add(sources[2]),
    ]).then(function () {
      collection.removeAll();

      expect(collection.length).toEqual(0);
      expect(removeCalled).toEqual(sources.length);
    });
  });

  it("destroy triggers remove events and calls destroy", function () {
    const sources = [
      new MockDataSource(),
      new MockDataSource(),
      new MockDataSource(),
    ];
    const collection = new DataSourceCollection();

    let removeCalled = 0;
    collection.dataSourceRemoved.addEventListener(function (
      sender,
      dataSource
    ) {
      expect(sender).toBe(collection);
      expect(sources.indexOf(dataSource)).not.toEqual(-1);
      removeCalled++;
    });

    return Promise.all([
      collection.add(sources[0]),
      collection.add(sources[1]),
      collection.add(sources[2]),
    ]).then(function () {
      expect(collection.isDestroyed()).toEqual(false);
      collection.destroy();
      expect(collection.isDestroyed()).toEqual(true);
      expect(removeCalled).toEqual(sources.length);
      expect(sources[0].destroyed).toEqual(true);
      expect(sources[1].destroyed).toEqual(true);
      expect(sources[2].destroyed).toEqual(true);
    });
  });

  it("remove returns fails for non-member", function () {
    const collection = new DataSourceCollection();
    expect(collection.remove(new MockDataSource())).toEqual(false);
  });

  it("get throws if passed undefined", function () {
    const collection = new DataSourceCollection();
    expect(function () {
      collection.get(undefined);
    }).toThrowDeveloperError();
  });

  it("add throws if passed undefined", function () {
    const collection = new DataSourceCollection();
    expect(function () {
      collection.add(undefined);
    }).toThrowDeveloperError();
  });
});
