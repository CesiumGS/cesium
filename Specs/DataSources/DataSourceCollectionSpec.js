import { DataSourceCollection } from "../../Source/Cesium.js";
import MockDataSource from "../MockDataSource.js";
import { when } from "../../Source/Cesium.js";

describe("DataSources/DataSourceCollection", function () {
  it("contains, get, getLength, and indexOf work", function () {
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

  it("getByName works", function () {
    var collection = new DataSourceCollection();
    var source1 = new MockDataSource();
    source1.name = "Name1";
    collection.add(source1);

    var source2 = new MockDataSource();
    source2.name = "Name1";
    collection.add(source2);

    var source3 = new MockDataSource();
    source3.name = "Name2";
    collection.add(source3);

    var res = collection.getByName("Name1");
    expect(res.length).toEqual(2);
    expect(res[0].name).toEqual("Name1");
    expect(res[1].name).toEqual("Name1");
  });

  it("add and remove events work", function () {
    var source = new MockDataSource();
    var collection = new DataSourceCollection();

    var addSpy = jasmine.createSpy("dataSourceAdded");
    collection.dataSourceAdded.addEventListener(addSpy);

    var removeSpy = jasmine.createSpy("dataSourceRemoved");
    collection.dataSourceRemoved.addEventListener(removeSpy);

    collection.add(source);
    expect(addSpy).toHaveBeenCalledWith(collection, source);
    expect(removeSpy).not.toHaveBeenCalled();

    addSpy.calls.reset();
    removeSpy.calls.reset();

    expect(collection.remove(source)).toEqual(true);
    expect(addSpy).not.toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(collection, source);
  });

  it("move event works", function () {
    var source = new MockDataSource();
    var collection = new DataSourceCollection();
    collection.add(source);

    var moveSpy = jasmine.createSpy("dataSourceMoved");
    collection.dataSourceMoved.addEventListener(moveSpy);

    collection.raise(source);
    collection.lower(source);
    collection.raiseToTop(source);
    collection.lowerToBottom(source);

    expect(moveSpy).not.toHaveBeenCalled();

    collection.add(new MockDataSource());
    collection.add(new MockDataSource());

    collection.raise(source);
    expect(moveSpy).toHaveBeenCalledWith(source, 1, 0);

    collection.lower(source);
    expect(moveSpy).toHaveBeenCalledWith(source, 0, 1);

    collection.raiseToTop(source);
    expect(moveSpy).toHaveBeenCalledWith(source, 2, 0);

    collection.lowerToBottom(source);
    expect(moveSpy).toHaveBeenCalledWith(source, 0, 2);
  });

  it("add works with promise", function () {
    var promise = when.defer();
    var source = new MockDataSource();
    var collection = new DataSourceCollection();

    var addSpy = jasmine.createSpy("dataSourceAdded");
    collection.dataSourceAdded.addEventListener(addSpy);
    collection.add(promise);

    expect(collection.length).toEqual(0);
    expect(addSpy).not.toHaveBeenCalled();

    promise.resolve(source);
    expect(addSpy).toHaveBeenCalledWith(collection, source);
    expect(collection.length).toEqual(1);
  });

  it("promise does not get added if not resolved before removeAll", function () {
    var promise = when.defer();
    var source = new MockDataSource();
    var collection = new DataSourceCollection();

    var addSpy = jasmine.createSpy("dataSourceAdded");
    collection.dataSourceAdded.addEventListener(addSpy);
    collection.add(promise);
    expect(collection.length).toEqual(0);

    expect(addSpy).not.toHaveBeenCalled();
    collection.removeAll();

    promise.resolve(source);
    expect(addSpy).not.toHaveBeenCalled();
    expect(collection.length).toEqual(0);
  });

  it("removeAll triggers events", function () {
    var sources = [
      new MockDataSource(),
      new MockDataSource(),
      new MockDataSource(),
    ];
    var collection = new DataSourceCollection();

    var removeCalled = 0;
    collection.dataSourceRemoved.addEventListener(function (
      sender,
      dataSource
    ) {
      expect(sender).toBe(collection);
      expect(sources.indexOf(dataSource)).not.toEqual(-1);
      removeCalled++;
    });

    collection.add(sources[0]);
    collection.add(sources[1]);
    collection.add(sources[2]);
    collection.removeAll();

    expect(collection.length).toEqual(0);
    expect(removeCalled).toEqual(sources.length);
  });

  it("destroy triggers remove events and calls destroy", function () {
    var sources = [
      new MockDataSource(),
      new MockDataSource(),
      new MockDataSource(),
    ];
    var collection = new DataSourceCollection();

    var removeCalled = 0;
    collection.dataSourceRemoved.addEventListener(function (
      sender,
      dataSource
    ) {
      expect(sender).toBe(collection);
      expect(sources.indexOf(dataSource)).not.toEqual(-1);
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

  it("remove returns fals for non-member", function () {
    var collection = new DataSourceCollection();
    expect(collection.remove(new MockDataSource())).toEqual(false);
  });

  it("get throws if passed undefined", function () {
    var collection = new DataSourceCollection();
    expect(function () {
      collection.get(undefined);
    }).toThrowDeveloperError();
  });

  it("add throws if passed undefined", function () {
    var collection = new DataSourceCollection();
    expect(function () {
      collection.add(undefined);
    }).toThrowDeveloperError();
  });
});
