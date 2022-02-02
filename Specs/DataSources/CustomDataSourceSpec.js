import { Event } from "../../Source/Cesium.js";
import { CustomDataSource } from "../../Source/Cesium.js";
import { DataSourceClock } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";

describe("DataSources/CustomDataSource", function () {
  it("constructor has expected defaults", function () {
    const dataSource = new CustomDataSource();
    expect(dataSource.name).toBeUndefined();
    expect(dataSource.clock).toBeUndefined();
    expect(dataSource.entities).toBeInstanceOf(EntityCollection);
    expect(dataSource.isLoading).toBe(false);
    expect(dataSource.changedEvent).toBeInstanceOf(Event);
    expect(dataSource.errorEvent).toBeInstanceOf(Event);
    expect(dataSource.loadingEvent).toBeInstanceOf(Event);
    expect(dataSource.show).toBe(true);
  });

  it("show sets underlying entity collection show.", function () {
    const dataSource = new CustomDataSource();

    dataSource.show = false;
    expect(dataSource.show).toBe(false);
    expect(dataSource.show).toEqual(dataSource.entities.show);

    dataSource.show = true;
    expect(dataSource.show).toBe(true);
    expect(dataSource.show).toEqual(dataSource.entities.show);
  });

  it("setting name raises changed event", function () {
    const dataSource = new CustomDataSource();

    const spy = jasmine.createSpy("changedEvent");
    dataSource.changedEvent.addEventListener(spy);

    const newName = "chester";
    dataSource.name = newName;
    expect(dataSource.name).toEqual(newName);
    expect(spy.calls.count()).toEqual(1);
    expect(spy).toHaveBeenCalledWith(dataSource);
  });

  it("setting clock raises changed event", function () {
    const dataSource = new CustomDataSource();

    const spy = jasmine.createSpy("changedEvent");
    dataSource.changedEvent.addEventListener(spy);

    const newClock = new DataSourceClock();
    dataSource.clock = newClock;
    expect(dataSource.clock).toBe(newClock);
    expect(spy.calls.count()).toEqual(1);
    expect(spy).toHaveBeenCalledWith(dataSource);
  });

  it("setting isLoading raises loading event", function () {
    const dataSource = new CustomDataSource();

    const spy = jasmine.createSpy("loadingEvent");
    dataSource.loadingEvent.addEventListener(spy);

    dataSource.isLoading = true;
    expect(spy.calls.count()).toEqual(1);
    expect(spy).toHaveBeenCalledWith(dataSource, true);

    dataSource.isLoading = false;
    expect(spy.calls.count()).toEqual(2);
    expect(spy).toHaveBeenCalledWith(dataSource, false);
  });

  it("has entity collection with link to data source", function () {
    const dataSource = new CustomDataSource();
    const entityCollection = dataSource.entities;
    expect(entityCollection.owner).toEqual(dataSource);
  });
});
