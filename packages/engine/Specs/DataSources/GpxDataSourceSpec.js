import {
  Cartesian3,
  Color,
  DeveloperError,
  EntityCollection,
  Event,
  GpxDataSource,
  HeightReference,
  Iso8601,
  JulianDate,
  RequestErrorEvent,
  RuntimeError,
  VerticalOrigin,
} from "../../index.js";

describe("DataSources/GpxDataSource", function () {
  const parser = new DOMParser();

  it("default constructor has expected values", function () {
    const dataSource = new GpxDataSource();
    expect(dataSource.name).toBeUndefined();
    expect(dataSource.clock).toBeUndefined();
    expect(dataSource.entities).toBeInstanceOf(EntityCollection);
    expect(dataSource.isLoading).toBe(false);
    expect(dataSource.changedEvent).toBeInstanceOf(Event);
    expect(dataSource.errorEvent).toBeInstanceOf(Event);
    expect(dataSource.loadingEvent).toBeInstanceOf(Event);
    expect(dataSource.show).toBe(true);
  });

  it("load throws with undefined GPX", function () {
    const dataSource = new GpxDataSource();
    expect(function () {
      dataSource.load(undefined);
    }).toThrowDeveloperError();
  });

  it("load works with a GPX URL", function () {
    const dataSource = new GpxDataSource();
    return dataSource.load("Data/GPX/simple.gpx").then(function (source) {
      expect(source).toBe(dataSource);
      expect(source.entities.values.length).toEqual(1);
    });
  });

  it("load rejects nonexistent URL", function () {
    return GpxDataSource.load("test.invalid").catch(function (e) {
      expect(e).toBeInstanceOf(RequestErrorEvent);
    });
  });

  it("load rejects loading non-GPX URL", function () {
    return GpxDataSource.load("Data/Images/Blue.png").catch(function (e) {
      expect(e).toBeInstanceOf(RuntimeError);
    });
  });

  it("sets DataSource creator and version from gpx", function () {
    const dataSource = new GpxDataSource();
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            </gpx>';
    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        expect(dataSource.version).toEqual("1.1");
        expect(dataSource.creator).toEqual("Test");
      });
  });

  it("sets DataSource name from metadata", function () {
    const dataSource = new GpxDataSource();
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            <metadata>\
                <name>File Name</name>\
            </metadata>\
            </gpx>';
    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        expect(dataSource.name).toEqual("File Name");
      });
  });

  it("sets DataSource metadata object correctly", function () {
    const dataSource = new GpxDataSource();
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            <metadata>\
                <name>The name</name>\
                <desc>The desc</desc>\
                <time>The time</time>\
                <keywords>The keyword</keywords>\
            </metadata>\
            </gpx>';
    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        const metadata = dataSource.metadata;
        expect(metadata).toBeDefined();

        expect(metadata.name).toEqual("The name");
        expect(metadata.desc).toEqual("The desc");
        expect(metadata.time).toEqual("The time");
        expect(metadata.keywords).toEqual("The keyword");
      });
  });

  it("Metadata: handles personType, emailType and linkType", function () {
    const dataSource = new GpxDataSource();
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            <metadata>\
                <author>\
                    <name>The name</name>\
                    <email>\
                        <id>user</id>\
                        <domain>email.com</domain>\
                    </email>\
                    <link href="www.a.com">\
                        <text>A website</text>\
                        <type>text/html</type>\
                    </link>\
                </author>\
            </metadata>\
            </gpx>';
    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        const metadata = dataSource.metadata;
        expect(metadata).toBeDefined();

        const person = metadata.author;
        expect(person).toBeDefined();
        expect(person.name).toEqual("The name");
        expect(person.email).toBeDefined();
        expect(person.email).toEqual("user@email.com");
        expect(person.link).toBeDefined();
        expect(person.link.href).toEqual("www.a.com");
        expect(person.link.text).toEqual("A website");
        expect(person.link.mimeType).toEqual("text/html");
      });
  });

  it("Metadata: handles copyrightType", function () {
    const dataSource = new GpxDataSource();
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            <metadata>\
                <copyright author="The author">\
                    <year>2015</year>\
                    <license>The license</license>\
                </copyright>\
            </metadata>\
            </gpx>';
    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        const metadata = dataSource.metadata;
        expect(metadata).toBeDefined();

        const copyright = metadata.copyright;
        expect(copyright).toBeDefined();
        expect(copyright.author).toEqual("The author");
        expect(copyright.year).toEqual("2015");
        expect(copyright.license).toEqual("The license");
      });
  });

  it("Metadata: handles boundsType", function () {
    const dataSource = new GpxDataSource();
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            <metadata>\
                <bounds>\
                    <minlat>1</minlat>\
                    <maxlat>2</maxlat>\
                    <minlon>3</minlon>\
                    <maxlon>4</maxlon>\
                </bounds>\
            </metadata>\
            </gpx>';
    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        const metadata = dataSource.metadata;
        expect(metadata).toBeDefined();

        const bounds = metadata.bounds;
        expect(bounds).toBeDefined();
        expect(bounds.minLat).toEqual(1);
        expect(bounds.maxLat).toEqual(2);
        expect(bounds.minLon).toEqual(3);
        expect(bounds.maxLon).toEqual(4);
      });
  });

  it("raises changed event when the name changes", function () {
    let gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Test">\
            <metadata>\
                <name>NameInGpx</name>\
            </metadata>\
            </gpx>';

    const dataSource = new GpxDataSource();

    const spy = jasmine.createSpy("changedEvent");
    dataSource.changedEvent.addEventListener(spy);

    return dataSource
      .load(parser.parseFromString(gpx, "text/xml"))
      .then(function () {
        //Initial load
        expect(spy).toHaveBeenCalledWith(dataSource);

        spy.calls.reset();
        return dataSource
          .load(parser.parseFromString(gpx, "text/xml"))
          .then(function () {
            //Loading GPX with same name
            expect(spy).not.toHaveBeenCalled();

            gpx = gpx.replace("NameInGpx", "newName");
            spy.calls.reset();
            return dataSource
              .load(parser.parseFromString(gpx, "text/xml"))
              .then(function () {
                //Loading KML with different name.
                expect(spy).toHaveBeenCalledWith(dataSource);
              });
          });
      });
  });

  it("raises loadingEvent event at start and end of load", function () {
    const dataSource = new GpxDataSource();

    const spy = jasmine.createSpy("loadingEvent");
    dataSource.loadingEvent.addEventListener(spy);

    const promise = dataSource.load("Data/GPX/simple.gpx");
    expect(spy).toHaveBeenCalledWith(dataSource, true);
    spy.calls.reset();

    return promise.then(function () {
      expect(spy).toHaveBeenCalledWith(dataSource, false);
    });
  });

  it("Waypoint: sets name", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lat="1" lon="2">\
                    <name>Test</name>\
                </wpt>\
            </gpx>';

    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];
        expect(entity.name).toBe("Test");
        expect(entity.label).toBeDefined();
        expect(entity.label.text.getValue()).toBe("Test");
      }
    );
  });

  it("Waypoint: throws with invalid coordinates", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lat="hello" lon="world">\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).catch(
      function (e) {
        expect(e).toBeInstanceOf(DeveloperError);
      }
    );
  });

  it("Waypoint: throws when no coordinates are given", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).catch(
      function (e) {
        expect(e).toBeInstanceOf(DeveloperError);
      }
    );
  });

  it("Waypoint: handles simple waypoint", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="38.737125" lat="-9.139242">\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(38.737125, -9.139242, undefined)
        );
        expect(entities[0].name).toEqual("Position 1");
      }
    );
  });

  it("Waypoint: uses default billboard style", function () {
    const BILLBOARD_SIZE = 32;
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="38.737125" lat="-9.139242">\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities[0].billboard.height.getValue()).toEqual(BILLBOARD_SIZE);
        expect(entities[0].billboard.width.getValue()).toEqual(BILLBOARD_SIZE);
        expect(entities[0].billboard.verticalOrigin.getValue()).toEqual(
          VerticalOrigin.BOTTOM
        );
        expect(entities[0].billboard.heightReference).toBeUndefined();
      }
    );
  });

  it("Waypoint: uses clampToGround billboards", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="38.737125" lat="-9.139242">\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      clampToGround: true,
    }).then(function (dataSource) {
      const entities = dataSource.entities.values;
      expect(entities[0].billboard.heightReference.getValue()).toEqual(
        HeightReference.CLAMP_TO_GROUND
      );
    });
  });

  it("Waypoint: uses custom image for billboard", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="38.737125" lat="-9.139242">\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';

    const image = document.createElement("img");
    image.name = "wpt";
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      clampToGround: true,
      waypointImage: image,
    }).then(function (dataSource) {
      const entities = dataSource.entities.values;
      const image = entities[0].billboard.image;
      expect(image.getValue().name).toEqual("wpt");
    });
  });

  it("Waypoint: handles simple waypoint with elevation", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <ele>3</ele>\
                    <name>Position 1</name>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(1, 2, 3)
        );
      }
    );
  });

  it("Waypoint: handles multiple waypoints", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <name>Position 1</name>\
                </wpt>\
                <wpt lon="3" lat="4">\
                    <name>Position 2</name>\
                </wpt>\
                <wpt lon="5" lat="6">\
                <name>Position 3</name>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(3);
        expect(entities[0].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(1, 2, undefined)
        );
        expect(entities[1].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(3, 4, undefined)
        );
        expect(entities[2].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(5, 6, undefined)
        );
      }
    );
  });

  it("Description: handles desc", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <desc>The Description</desc>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual("Description: The Description");
      }
    );
  });

  it("Description: handles time", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <time>2015-08-17T00:06Z</time>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual("Time: 2015-08-17T00:06Z");
      }
    );
  });

  it("Description: handles comment", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <cmt>The comment</cmt>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual("Comment: The comment");
      }
    );
  });

  it("Description: handles source", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <src>The source</src>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual("Source: The source");
      }
    );
  });

  it("Description: handles gps number", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <number>The number</number>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual("GPS track/route number: The number");
      }
    );
  });

  it("Description: handles type", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <type>The type</type>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual("Type: The type");
      }
    );
  });

  it("Description: handles multiple fields", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <wpt lon="1" lat="2">\
                    <cmt>The comment</cmt>\
                    <desc>The description</desc>\
                    <type>The type</type>\
                </wpt>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual(
          "Comment: The commentDescription: The descriptionType: The type"
        );
      }
    );
  });

  it("Description: handles route description", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <rte>\
                    <cmt>The comment</cmt>\
                    <desc>The description</desc>\
                    <type>The type</type>\
                    <rtept lon="1" lat="2">\
                        <ele>1</ele>\
                        <name>Position 1</name>\
                    </rtept>\
                    <rtept lon="3" lat="4">\
                        <ele>1</ele>\
                        <name>Position 2</name>\
                    </rtept>\
                    <rtept lon="5" lat="6">\
                        <ele>1</ele>\
                        <name>Position 3</name>\
                    </rtept>\
                    <rtept lon="7" lat="8">\
                        <ele>1</ele>\
                        <name>Position 4</name>\
                    </rtept>\
                </rte>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entity = dataSource.entities.values[0];

        const element = document.createElement("div");
        element.innerHTML = entity.description.getValue();

        const div = element.firstChild;
        expect(div.style["word-wrap"]).toEqual("break-word");
        expect(div.style["background-color"]).toEqual("rgb(255, 255, 255)");
        expect(div.style.color).toEqual("rgb(0, 0, 0)");
        expect(div.textContent).toEqual(
          "Comment: The commentDescription: The descriptionType: The type"
        );
      }
    );
  });

  it("Route: handles simple route", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <rte>\
                    <name>Test Route</name>\
                    <rtept lon="1" lat="2">\
                        <ele>1</ele>\
                        <name>Position 1</name>\
                    </rtept>\
                    <rtept lon="3" lat="4">\
                        <ele>1</ele>\
                        <name>Position 2</name>\
                    </rtept>\
                    <rtept lon="5" lat="6">\
                        <ele>1</ele>\
                        <name>Position 3</name>\
                    </rtept>\
                    <rtept lon="7" lat="8">\
                        <ele>1</ele>\
                        <name>Position 4</name>\
                    </rtept>\
                </rte>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(5); //1 for the route and 4 routepoints
        expect(entities[1].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(1, 2, 1)
        );
        expect(entities[2].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(3, 4, 1)
        );
        expect(entities[3].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(5, 6, 1)
        );
        expect(entities[4].position.getValue(Iso8601.MINIMUM_VALUE)).toEqual(
          Cartesian3.fromDegrees(7, 8, 1)
        );
      }
    );
  });

  it("Track: handles simple track", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);

        const entity = entities[0];
        expect(entity.path).toBeUndefined();
        expect(entity.polyline).toBeDefined();

        const positions = entity.polyline.positions.getValue(
          Iso8601.MINIMUM_VALUE
        );
        expect(positions).toEqual([
          Cartesian3.fromDegrees(1, 2, 1),
          Cartesian3.fromDegrees(3, 4, 1),
        ]);
      }
    );
  });

  it("Track: uses default polyline style", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);

        const entity = entities[0];
        expect(entity.path).toBeUndefined();
        expect(entity.polyline).toBeDefined();
        expect(entity.polyline.width.getValue()).toEqual(4);
        expect(entity.polyline.material.getValue()).toBeDefined();
        expect(entity.polyline.material.color.getValue()).toEqual(Color.RED);
        expect(entity.polyline.material.outlineWidth.getValue()).toEqual(2);
        expect(entity.polyline.material.outlineColor.getValue()).toEqual(
          Color.BLACK
        );
      }
    );
  });

  it("Track: uses custom polyline color for tracks", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      trackColor: Color.BLUE,
    }).then(function (dataSource) {
      const entities = dataSource.entities.values;
      expect(entities.length).toEqual(1);
      const entity = entities[0];
      expect(entity.polyline.material.color.getValue()).toEqual(Color.BLUE);
      expect(entity.polyline.clampToGround).toBeUndefined();
    });
  });

  it("Track: uses custom polyline color for routes", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
        <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
          <rte>\
            <rtept lon="9.860624216140083" lat="54.9328621088893">\
                <ele>0.0</ele>\
                <name>Position 1</name>\
            </rtept>\
            <rtept lon="9.86092208681491" lat="54.93293237320851">\
                <ele>0.0</ele>\
                <name>Position 2</name>\
            </rtept>\
            <rtept lon="9.86187816543752" lat="54.93327743521187">\
                <ele>0.0</ele>\
                <name>Position 3</name>\
            </rtept>\
            <rtept lon="9.862439849679859" lat="54.93342326167919">\
                <ele>0.0</ele>\
                <name>Position 4</name>\
            </rtept>\
          </rte>\
        </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      routeColor: Color.BLUE,
    }).then(function (dataSource) {
      const entities = dataSource.entities.values;
      expect(entities.length).toEqual(5); // 4 waypoints + 1 polyline
      const entity = entities[0];
      expect(entity.polyline.material.color.getValue()).toEqual(Color.BLUE);
      expect(entity.polyline.clampToGround).toBeUndefined();
    });
  });

  it("Track: uses clampToGround polylines", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      clampToGround: true,
    }).then(function (dataSource) {
      const entities = dataSource.entities.values;
      expect(entities.length).toEqual(1);
      const entity = entities[0];
      expect(entity.polyline.clampToGround.getValue()).toEqual(true);
    });
  });

  it("Track: handles time-dynamic track", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                            <time>2000-01-01T00:00:00Z</time>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            <time>2000-01-01T00:00:01Z</time>\
                        </trkpt>\
                        <trkpt lon="5" lat="6">\
                            <ele>1.0</ele>\
                            <name>Position 3</name>\
                            <time>2000-01-01T00:00:02Z</time>\
                        </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const time1 = JulianDate.fromIso8601("2000-01-01T00:00:00Z");
        const time2 = JulianDate.fromIso8601("2000-01-01T00:00:01Z");
        const time3 = JulianDate.fromIso8601("2000-01-01T00:00:02Z");

        const entity = dataSource.entities.values[0];
        expect(entity.position.getValue(time1)).toEqual(
          Cartesian3.fromDegrees(1, 2, 1)
        );
        expect(entity.position.getValue(time2)).toEqual(
          Cartesian3.fromDegrees(3, 4, 1)
        );
        expect(entity.position.getValue(time3)).toEqual(
          Cartesian3.fromDegrees(5, 6, 1)
        );
        expect(entity.polyline).toBeDefined();

        expect(entity.availability.start).toEqual(time1);
        expect(entity.availability.stop).toEqual(time3);
      }
    );
  });

  it("Track: time-dynamic uses default path style", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                            <time>2000-01-01T00:00:00Z</time>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            <time>2000-01-01T00:00:01Z</time>\
                        </trkpt>\
                        <trkpt lon="5" lat="6">\
                            <ele>1.0</ele>\
                            <name>Position 3</name>\
                            <time>2000-01-01T00:00:02Z</time>\
                        </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml")).then(
      function (dataSource) {
        const entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);

        const entity = entities[0];
        expect(entity.polyline).toBeDefined();
        expect(entity.polyline.width.getValue()).toEqual(4);
        expect(entity.polyline.material.getValue()).toBeDefined();
        expect(entity.polyline.material.color.getValue()).toEqual(Color.RED);
        expect(entity.polyline.material.outlineWidth.getValue()).toEqual(2);
        expect(entity.polyline.material.outlineColor.getValue()).toEqual(
          Color.BLACK
        );
      }
    );
  });

  it("Track: time-dynamic track uses clampToGround", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
            <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
                <trk>\
                <name>Test Track</name>\
                    <trkseg>\
                        <trkpt lon="1" lat="2">\
                            <ele>1.0</ele>\
                            <name>Position 1</name>\
                            <time>2000-01-01T00:00:00Z</time>\
                        </trkpt>\
                        <trkpt lon="3" lat="4">\
                            <ele>1.0</ele>\
                            <name>Position 2</name>\
                            <time>2000-01-01T00:00:01Z</time>\
                        </trkpt>\
                        <trkpt lon="5" lat="6">\
                            <ele>1.0</ele>\
                            <name>Position 3</name>\
                            <time>2000-01-01T00:00:02Z</time>\
                        </trkpt>\
                    </trkseg>\
                </trk>\
            </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      clampToGround: true,
    }).then(function (dataSource) {
      const entities = dataSource.entities.values;

      const entity = entities[0];
      expect(entity.polyline).toBeDefined();
      expect(entity.polyline.clampToGround.getValue()).toEqual(true);
    });
  });

  it("update returns true", function () {
    const gpx =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\
          <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="andre">\
              <trk>\
              <name>Test Track</name>\
                  <trkseg>\
                      <trkpt lon="1" lat="2">\
                          <ele>1.0</ele>\
                          <name>Position 1</name>\
                      </trkpt>\
                      <trkpt lon="3" lat="4">\
                          <ele>1.0</ele>\
                          <name>Position 2</name>\
                          </trkpt>\
                  </trkseg>\
              </trk>\
          </gpx>';
    return GpxDataSource.load(parser.parseFromString(gpx, "text/xml"), {
      clampToGround: true,
    }).then(function (dataSource) {
      expect(dataSource.update()).toBe(true);
    });
  });
});
