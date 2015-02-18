/*global defineSuite*/
defineSuite([
        'DataSources/KmlDataSource',
        'Core/BoundingRectangle',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Color',
        'Core/DeveloperError',
        'Core/Ellipsoid',
        'Core/Event',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/loadBlob',
        'Core/loadXML',
        'Core/Math',
        'Core/Rectangle',
        'Core/RuntimeError',
        'DataSources/ColorMaterialProperty',
        'DataSources/CompositeProperty',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'DataSources/ImageMaterialProperty',
        'Specs/waitsForPromise'
    ], function(
        KmlDataSource,
        BoundingRectangle,
        Cartesian3,
        Cartographic,
        Color,
        DeveloperError,
        Ellipsoid,
        Event,
        Iso8601,
        JulianDate,
        loadBlob,
        loadXML,
        CesiumMath,
        Rectangle,
        RuntimeError,
        ColorMaterialProperty,
        CompositeProperty,
        ConstantProperty,
        EntityCollection,
        ImageMaterialProperty,
        waitsForPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var parser = new DOMParser();

    it('default constructor has expected values', function() {
        var dataSource = new KmlDataSource();
        expect(dataSource.name).toBeUndefined();
        expect(dataSource.clock).toBeUndefined();
        expect(dataSource.entities).toBeInstanceOf(EntityCollection);
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.isLoading).toBe(false);
        expect(dataSource.changedEvent).toBeInstanceOf(Event);
        expect(dataSource.errorEvent).toBeInstanceOf(Event);
        expect(dataSource.loadingEvent).toBeInstanceOf(Event);
    });

    it('load throws with undefined KML', function() {
        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.load(undefined);
        }).toThrowDeveloperError();
    });

    it('loadKmz throws with undefined blob', function() {
        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.loadKmz(undefined);
        }).toThrowDeveloperError();
    });

    xit('loadKmz rejects loading non-KMZ file', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise(loadBlob('Data/Images/Blue.png'), function(blob) {
            waitsForPromise.toReject(dataSource.loadKmz(blob));
        });
    });

    it('loadKmz rejects KMZ file with no KML contained', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise(loadBlob('Data/KML/empty.zip'), function(blob) {
            waitsForPromise.toReject(dataSource.loadKmz(blob));
        });
    });

    it('loadUrl works with a KML file', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise(dataSource.loadUrl('Data/KML/simple.kml'), function(source) {
            expect(source).toBe(dataSource);
            expect(source.entities.values.length).toEqual(1);
        });
    });

    it('loadUrl works with a KMZ file', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise(dataSource.loadUrl('Data/KML/simple.kmz'), function(source) {
            expect(source).toBe(dataSource);
            expect(source.entities.values.length).toEqual(1);
        });
    });

    it('loadUrl throws with undefined Url', function() {
        var dataSource = new KmlDataSource();
        expect(function() {
            dataSource.loadUrl(undefined);
        }).toThrowDeveloperError();
    });

    it('loadUrl rejects loading nonexistent file', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise.toReject(dataSource.loadUrl('//test.invalid/invalid.kml'));
    });

    it('loadUrl rejects loading non-KML file', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise.toReject(dataSource.loadUrl('Data/Images/Blue.png'));
    });

    it('loadUrl rejects KMZ file with no KML contained', function() {
        var dataSource = new KmlDataSource();
        waitsForPromise.toReject(dataSource.loadUrl('Data/KML/empty.zip'));
    });

    it('fromUrl works', function() {
        var dataSource = KmlDataSource.fromUrl('Data/KML/simple.kml');

        waitsFor(function() {
            return !dataSource.isLoading;
        });

        runs(function() {
            expect(dataSource.entities.values.length).toEqual(1);
        });
    });

    it('sets DataSource name from Document', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <name>NameInKml</name>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"), 'NameFromUri.kml');
        expect(dataSource.name).toEqual('NameInKml');
    });

    it('sets DataSource name from sourceUri when not in file', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"), 'NameFromUri.kml');
        expect(dataSource.name).toEqual('NameFromUri.kml');
    });

    it('Feature: id', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark id="Bob">\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.id).toBe('Bob');
    });

    it('Feature: name', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <name>bob</name>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.name).toBe('bob');
    });

    it('Feature: address', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <address>1826 South 16th Street</address>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.kml.address).toBe('1826 South 16th Street');
    });

    it('Feature: phoneNumber', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <phoneNumber>555-555-5555</phoneNumber>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.kml.phoneNumber).toBe('555-555-5555');
    });

    it('Feature: Snippet', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <Snippet>Hey!</Snippet>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.kml.Snippet).toBe('Hey!');
    });

    it('Feature: atom:author', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <kml xmlns="http://www.opengis.net/kml/2.2"\
         xmlns:atom="http://www.w3.org/2005/Atom">\
        <Placemark>\
            <atom:author>\
                <atom:name>J.R.R. Tolkien</atom:name>\
                <atom:email>gandalf@greyhavens.invalid</atom:email>\
                <atom:uri>http://greyhavens.invalid</atom:uri>\
            </atom:author>\
        </Placemark>\
        </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.kml).toBeDefined();
        expect(entity.kml.author).toBeDefined();
        expect(entity.kml.author.name).toBe('J.R.R. Tolkien');
        expect(entity.kml.author.email).toBe('gandalf@greyhavens.invalid');
        expect(entity.kml.author.uri).toBe('http://greyhavens.invalid');
    });

    it('Feature: atom:link', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <kml xmlns="http://www.opengis.net/kml/2.2"\
         xmlns:atom="http://www.w3.org/2005/Atom">\
        <Placemark>\
            <atom:link\
                href="http://test.invalid"\
                hreflang="en-US"\
                rel="alternate"\
                type="text/plain"\
                title="Invalid!"\
                length="123"/>\
        </Placemark>\
        </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.kml).toBeDefined();
        expect(entity.kml.link).toBeDefined();
        expect(entity.kml.link.href).toEqual('http://test.invalid');
        expect(entity.kml.link.hreflang).toEqual('en-US');
        expect(entity.kml.link.rel).toEqual('alternate');
        expect(entity.kml.link.type).toEqual('text/plain');
        expect(entity.kml.link.title).toEqual('Invalid!');
        expect(entity.kml.link.length).toEqual('123');
    });

    it('Feature: TimeSpan', function() {
        var endDate = JulianDate.fromIso8601('1945-08-06');
        var beginDate = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <begin>1945-08-06</begin>\
              <end>1941-12-07</end>\
            </TimeSpan>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.availability).toBeDefined();
        expect(entity.availability.start).toEqual(beginDate);
        expect(entity.availability.stop).toEqual(endDate);
    });

    it('Feature: TimeSpan flips dates when end date is earlier', function() {
        var endDate = JulianDate.fromIso8601('1945-08-06');
        var beginDate = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <begin>1941-12-07</begin>\
              <end>1945-08-06</end>\
            </TimeSpan>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.availability).toBeDefined();
        expect(entity.availability.start).toEqual(beginDate);
        expect(entity.availability.stop).toEqual(endDate);
    });

    it('Feature: TimeSpan gracefully handles empty fields', function() {
        var endDate = JulianDate.fromIso8601('1945-08-06');
        var beginDate = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
            </TimeSpan>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.availability).toBeUndefined();
    });

    it('Feature: TimeSpan works with end only interval', function() {
        var date = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <end>1941-12-07</end>\
            </TimeSpan>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.availability).toBeDefined();
        expect(entity.availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(entity.availability.stop).toEqual(date);
    });

    it('Feature: TimeSpan works with begin only interval', function() {
        var date = JulianDate.fromIso8601('1941-12-07');

        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <TimeSpan>\
              <begin>1941-12-07</begin>\
            </TimeSpan>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.availability).toBeDefined();
        expect(entity.availability.start).toEqual(date);
        expect(entity.availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('Feature: ExtendedData', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <ExtendedData>\
                <Data name="prop1">\
                    <displayName>Property 1</displayName>\
                    <value>1</value>\
                </Data>\
                <Data name="prop2">\
                    <value>2</value>\
                </Data>\
                <Data name="prop3">\
                    <displayName>Property 3</displayName>\
                </Data>\
            </ExtendedData>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.kml.extendedData).toBeDefined();

        expect(entity.kml.extendedData.prop1).toBeDefined();
        expect(entity.kml.extendedData.prop1.displayName).toEqual('Property 1');
        expect(entity.kml.extendedData.prop1.value).toEqual('1');

        expect(entity.kml.extendedData.prop2).toBeDefined();
        expect(entity.kml.extendedData.prop2.displayName).toBeUndefined();
        expect(entity.kml.extendedData.prop2.value).toEqual('2');

        expect(entity.kml.extendedData.prop3).toBeDefined();
        expect(entity.kml.extendedData.prop3.displayName).toEqual('Property 3');
        expect(entity.kml.extendedData.prop3.value).toBeUndefined();
    });

    it('Feature: BalloonStyle with all properties', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark id="The ID">\
            <Style>\
            <BalloonStyle>\
                <bgColor>00224466</bgColor>\
                <textColor>66442200</textColor>\
                <text>$[name] $[description] $[address] $[Snippet] $[id] $[prop1/displayName] $[prop1] $[prop2/displayName] $[prop2]</text>\
            </BalloonStyle>\
            </Style>\
            <name>The Name</name>\
            <description>The Description</description>\
            <address>The Address</address>\
            <Snippet>The Snippet</Snippet>\
            <ExtendedData>\
            <Data name="prop1">\
                <displayName>The Property</displayName>\
                <value>The Value</value>\
            </Data>\
            </ExtendedData>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];

        var element = document.createElement('div');
        element.innerHTML = entity.description.getValue();

        var div = element.firstChild;
        expect(div.style['overflow-wrap']).toEqual('break-word');
        expect(div.style['background-color']).toEqual('rgba(102, 68, 34, 0)');
        expect(div.style.color).toEqual('rgba(0, 34, 68, 0.4)');
        expect(div.textContent).toEqual('The Name The Description The Address The Snippet The ID The Property The Value $[prop2/displayName] $[prop2]');
    });

    it('Feature: BalloonStyle entity replacement removes missing values', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <Style>\
            <BalloonStyle>\
                <text>$[name] $[description] $[address] $[Snippet]</text>\
            </BalloonStyle>\
            </Style>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];

        var element = document.createElement('div');
        element.innerHTML = entity.description.getValue();

        var div = element.firstChild;
        expect(div.textContent).toEqual('   ');
    });

    it('Feature: description without BalloonStyle', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <Placemark>\
            <description>The Description</description>\
        </Placemark>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];

        var element = document.createElement('div');
        element.innerHTML = entity.description.getValue();

        var div = element.firstChild;
        expect(div.style['overflow-wrap']).toEqual('break-word');
        expect(div.style['background-color']).toEqual('rgb(255, 255, 255)');
        expect(div.style.color).toEqual('rgb(0, 0, 0)');
        expect(div.textContent).toEqual('The Description');
    });

    it('GroundOverlay: Sets defaults', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
        </GroundOverlay>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.name).toBeUndefined();
        expect(entity.availability).toBeUndefined();
        expect(entity.description).toBeUndefined();
        expect(entity.rectangle).toBeDefined();
        expect(entity.rectangle.height).toBeUndefined();
        expect(entity.rectangle.rotation).toBeUndefined();
        expect(entity.rectangle.coordinates).toBeUndefined();
        expect(entity.rectangle.material).toBeUndefined();
    });

    it('GroundOverlay: Sets rectangle image material', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <Icon>\
                <href>http://test.invalid/image.png</href>\
            </Icon>\
        </GroundOverlay>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.rectangle.material).toBeInstanceOf(ImageMaterialProperty);
        expect(entity.rectangle.material.image.getValue()).toEqual('http://test.invalid/image.png');
    });

    it('GroundOverlay: Sets rectangle color material', function() {
        var color = Color.fromBytes(0xcc, 0xdd, 0xee, 0xff);
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <color>ffeeddcc</color>\
        </GroundOverlay>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.rectangle.material).toBeInstanceOf(ColorMaterialProperty);
        expect(entity.rectangle.material.color.getValue()).toEqual(color);
    });

    it('GroundOverlay: Sets rectangle coordinates and rotation', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <LatLonBox>\
                <west>3</west>\
                <south>1</south>\
                <east>4</east>\
                <north>2</north>\
                <rotation>45</rotation>\
            </LatLonBox>\
        </GroundOverlay>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.rectangle.coordinates.getValue()).toEqualEpsilon(Rectangle.fromDegrees(3, 1, 4, 2), CesiumMath.EPSILON14);
        expect(entity.rectangle.rotation.getValue()).toEqual(Math.PI / 4);
    });

    it('GroundOverlay: Sets rectangle absolute height', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
        <GroundOverlay>\
            <altitudeMode>absolute</altitudeMode>\
            <altitude>23</altitude>\
        </GroundOverlay>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.rectangle.height.getValue()).toEqual(23);
    });

    /*
    * Tests below this comment need to be reevaluated.
    */
    it('loads shared styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].billboard.scale.getValue()).toEqual(3.0);
    });

    it('loads external styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <styleUrl>Data/KML/externalStyle.kml#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        waitsFor(function() {
            return entities.length === 1;
        });

        runs(function() {
            expect(entities[0].billboard.scale.getValue()).toEqual(3.0);
        });
    });

    it('inline styles take precedance over shared styles', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
              <IconStyle>\
                  <scale>3</scale>\
                  <Icon>\
                    <href>http://test.invalid</href>\
                  </Icon>\
              </IconStyle>\
            </Style>\
            <Placemark>\
              <styleUrl>#testStyle</styleUrl>\
              <Style>\
                <IconStyle>\
                  <scale>2</scale>\
                </IconStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);

        var billboard = entities[0].billboard;
        expect(billboard.scale.getValue()).toEqual(2.0);
        expect(billboard.image.getValue()).toEqual('http://test.invalid');
    });

//    it('processPlacemark throws error with invalid geometry', function() {
//        var placemarkKml = '<?xml version="1.0" encoding="UTF-8"?>\
//            <kml xmlns="http://www.opengis.net/kml/2.2">\
//            <Document>\
//            <Placemark>\
//              <Invalid>\
//                <coordinates>d s</coordinates>\
//              </Invalid>\
//            </Placemark>\
//            </Document>\
//            </kml>';
//
//        var dataSource = new KmlDataSource();
//        var error;
//        dataSource.load(parser.parseFromString(placemarkKml, "text/xml")).otherwise(function(e) {
//            error = e;
//        });
//
//        waitsFor(function() {
//            return error instanceof RuntimeError;
//        });
//    });

//    it('processMultiGeometry throws error with invalid geometry', function() {
//        var placemarkKml = '<?xml version="1.0" encoding="UTF-8"?>\
//            <kml xmlns="http://www.opengis.net/kml/2.2">\
//            <Document>\
//            <Placemark>\
//            <MultiGeometry>\
//              <Invalid>\
//                <coordinates> </coordinates>\
//              </Invalid>\
//            </MultiGeometry>\
//            </Placemark>\
//            </Document>\
//            </kml>';
//
//        var dataSource = new KmlDataSource();
//        expect(function() {
//            dataSource.load(placemarkKml);
//        }).toThrowDeveloperError();
//    });

    it('handles Point Geometry', function() {
        var position = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 3);
        var cartesianPosition = Ellipsoid.WGS84.cartographicToCartesian(position);
        var time = new JulianDate();
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Point>\
                <coordinates>1,2,3</coordinates>\
              </Point>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(pointKml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].position.getValue(time)).toEqual(cartesianPosition);
    });

//    it('processPoint throws error with invalid coordinates', function() {
//        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
//            <kml xmlns="http://www.opengis.net/kml/2.2">\
//            <Document>\
//            <Placemark>\
//              <Point>\
//                <coordinates> </coordinates>\
//              </Point>\
//            </Placemark>\
//            </Document>\
//            </kml>';
//
//        var dataSource = new KmlDataSource();
//        expect(function() {
//            dataSource.load(pointKml);
//        }).toThrowDeveloperError();
//    });

    it('handles Point Geometry with LabelStyle', function() {
        var name = new ConstantProperty('LabelStyle.kml');
        var scale = new ConstantProperty(1.5);
        var color = new ConstantProperty(Color.fromBytes(255, 0, 0, 0));
        var pointKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
            <name>LabelStyle.kml</name>\
                <Style id="randomLabelColor">\
                    <LabelStyle>\
                        <color>000000ff</color>\
                        <colorMode>normal</colorMode>\
                        <scale>1.5</scale>\
                    </LabelStyle>\
                </Style>\
            <Point>\
                <coordinates>1,2,0</coordinates>\
            </Point>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(pointKml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].label.text.getValue()).toEqual(name.getValue());
        expect(entities[0].label.fillColor.red).toEqual(color.red);
        expect(entities[0].label.fillColor.green).toEqual(color.green);
        expect(entities[0].label.fillColor.blue).toEqual(color.blue);
        expect(entities[0].label.fillColor.alpha).toEqual(color.alpha);
    });

    it('handles Line Geometry with two sets of coordinates', function() {
        var position1 = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition1 = Ellipsoid.WGS84.cartographicToCartesian(position1);
        var position2 = new Cartographic(CesiumMath.toRadians(4), CesiumMath.toRadians(5), 0);
        var cartesianPosition2 = Ellipsoid.WGS84.cartographicToCartesian(position2);
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
    <kml xmlns="http://www.opengis.net/kml/2.2">\
    <Document>\
    <Placemark>\
      <LineString>\
        <coordinates>1,2,0 \
                     4,5,0 \
        </coordinates>\
      </LineString>\
    </Placemark>\
    </Document>\
    </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(lineKml, "text/xml"));

        var entities = dataSource.entities.values;
        var entity = entities[0];
        expect(entities.length).toEqual(1);
        expect(entity.polyline.positions.getValue()[0]).toEqual(cartesianPosition1);
        expect(entity.polyline.positions.getValue()[1]).toEqual(cartesianPosition2);
    });

//    it('processLineString throws error with invalid coordinates', function() {
//        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
//            <kml xmlns="http://www.opengis.net/kml/2.2">\
//            <Document>\
//            <Placemark>\
//              <LineString>\
//                <coordinates>1 \
//                             4,5,0 \
//                </coordinates>\
//              </LineString>\
//            </Placemark>\
//            </Document>\
//            </kml>';
//
//        var dataSource = new KmlDataSource();
//        expect(function() {
//            dataSource.load(lineKml);
//        }).toThrowDeveloperError();
//    });

    it('handles Coordinates without altitude', function() {
        var position1 = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition1 = Ellipsoid.WGS84.cartographicToCartesian(position1);
        var position2 = new Cartographic(CesiumMath.toRadians(4), CesiumMath.toRadians(5), 0);
        var cartesianPosition2 = Ellipsoid.WGS84.cartographicToCartesian(position2);
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
    <kml xmlns="http://www.opengis.net/kml/2.2">\
    <Document>\
    <Placemark>\
      <LineString>\
        <coordinates>1,2 \
                     4,5 \
        </coordinates>\
      </LineString>\
    </Placemark>\
    </Document>\
    </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(lineKml, "text/xml"));

        var entities = dataSource.entities.values;
        var entity = entities[0];
        expect(entities.length).toEqual(1);
        expect(entity.polyline.positions.getValue()[0]).toEqual(cartesianPosition1);
        expect(entity.polyline.positions.getValue()[1]).toEqual(cartesianPosition2);
    });

    it('handles Polygon geometry', function() {
        var polygonKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Placemark>\
              <Polygon>\
                <outerBoundaryIs>\
                  <LinearRing>\
                    <coordinates>\
                      -122,37,0\
                      -123,38,0\
                      -124,39,0\
                      -125,40,0\
                      -122,37,0\
                    </coordinates>\
                  </LinearRing>\
                </outerBoundaryIs>\
              </Polygon>\
            </Placemark>\
            </kml>';

        var coordinates = [Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-122, 37, 0)),
                           Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-123, 38, 0)),
                           Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-124, 39, 0)),
                           Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-125, 40, 0)),
                           Ellipsoid.WGS84.cartographicToCartesian(Cartographic.fromDegrees(-122, 37, 0))];

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(polygonKml, "text/xml"));

        var entities = dataSource.entities.values;
        var entity = entities[0];
        expect(entity.polygon.hierarchy.getValue().positions).toEqual(coordinates);
    });

    it('handles gx:Track', function() {
        var cartographic = Cartographic.fromDegrees(7, 8, 9);
        var value = Ellipsoid.WGS84.cartographicToCartesian(cartographic);
        var time = new JulianDate.fromIso8601('2010-05-28T02:02:09Z');
        var trackKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2"\
             xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Document>\
            <Placemark>\
            <gx:Track>\
              <when>2010-05-28T02:02:09Z</when>\
              <gx:coord>7 8 9</gx:coord>\
            </gx:Track>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(trackKml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.position.getValue(time)).toEqual(value);
    });

    it('processGxTrack throws error with invalid input', function() {
        var trackKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2"\
             xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Document>\
            <Placemark>\
            <gx:Track>\
              <when>2010-05-28T02:02:09Z</when>\
              <gx:coord>-122.207881 37.371915 156.000000</gx:coord>\
              <gx:coord>-122.205712 37.373288 152.000000</gx:coord>\
            </gx:Track>\
            </Placemark>\
            </Document>\
            </kml>';

        var error;
        var dataSource = new KmlDataSource();
        waitsForPromise.toReject(dataSource.load(parser.parseFromString(trackKml, "text/xml")));
    });

    it('handles gx:MultiTrack', function() {
        var time = new JulianDate.fromIso8601('2010-05-28T02:02:09Z');
        var trackKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2"\
             xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Document>\
            <Placemark>\
            <gx:MultiTrack>\
            <gx:Track>\
              <when>2010-05-28T02:02:09Z</when>\
              <gx:coord>7 8 9</gx:coord>\
            </gx:Track>\
            <gx:Track>\
            <when>2010-05-28T02:02:09Z</when>\
            <gx:coord>7 8 9</gx:coord>\
            </gx:Track>\
            </gx:MultiTrack>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(trackKml, "text/xml"));

        var entity = dataSource.entities.values[0];
        expect(entity.position).toBeInstanceOf(CompositeProperty);
    });

    it('handles MultiGeometry', function() {
        var position1 = new Cartographic(CesiumMath.toRadians(1), CesiumMath.toRadians(2), 0);
        var cartesianPosition1 = Ellipsoid.WGS84.cartographicToCartesian(position1);
        var position2 = new Cartographic(CesiumMath.toRadians(4), CesiumMath.toRadians(5), 0);
        var cartesianPosition2 = Ellipsoid.WGS84.cartographicToCartesian(position2);
        var position3 = new Cartographic(CesiumMath.toRadians(6), CesiumMath.toRadians(7), 0);
        var cartesianPosition3 = Ellipsoid.WGS84.cartographicToCartesian(position3);
        var position4 = new Cartographic(CesiumMath.toRadians(8), CesiumMath.toRadians(9), 0);
        var cartesianPosition4 = Ellipsoid.WGS84.cartographicToCartesian(position4);
        var multiKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Placemark>\
            <MultiGeometry>\
              <LineString>\
                <coordinates>\
                  1,2,0\
                  4,5,0\
                </coordinates>\
              </LineString>\
              <LineString>\
                <coordinates>\
                  6,7,0\
                  8,9,0\
                </coordinates>\
              </LineString>\
            </MultiGeometry>\
            </Placemark>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(multiKml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(3);
        expect(entities[1].polyline.positions.getValue()[0]).toEqual(cartesianPosition1);
        expect(entities[1].polyline.positions.getValue()[1]).toEqual(cartesianPosition2);
        expect(entities[2].polyline.positions.getValue()[0]).toEqual(cartesianPosition3);
        expect(entities[2].polyline.positions.getValue()[1]).toEqual(cartesianPosition4);
    });

    it('handles MultiGeometry with style', function() {
        var multiKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="randomColorIcon">\
                <IconStyle>\
                    <color>ff00ff00</color>\
                    <colorMode>normal</colorMode>\
                    <scale>1.1</scale>\
                    <Icon>\
                    <href>http://maps.google.com/mapfiles/kml/pal3/icon21.png</href>\
                    </Icon>\
                </IconStyle>\
            </Style>\
            <Placemark>\
            <name>IconStyle.kml</name>\
            <styleUrl>#randomColorIcon</styleUrl>\
                <MultiGeometry>\
                <Point>\
                    <coordinates>-9.171441666666666,38.67883055555556,0</coordinates>\
                </Point>\
                <Point>\
                    <coordinates>-122.367375,37.829192,0</coordinates>\
                </Point>\
                </MultiGeometry>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(multiKml, "text/xml"));

        var entities = dataSource.entities.values;
        var entity1 = entities[1];
        var entity2 = entities[2];
        expect(entities.length).toEqual(3);
        expect(entity1.billboard.scale.getValue()).toEqual(entity2.billboard.scale.getValue());
        expect(entity1.billboard.image.getValue()).toEqual(entity2.billboard.image.getValue());
        expect(entity1.billboard.color.red).toEqual(entity2.billboard.color.red);
        expect(entity1.billboard.color.green).toEqual(entity2.billboard.color.green);
        expect(entity1.billboard.color.blue).toEqual(entity2.billboard.color.blue);
        expect(entity1.billboard.color.alpha).toEqual(entity2.billboard.color.alpha);
    });

    it('handles IconStyle', function() {
        var scale = new ConstantProperty(1.1);
        var color = new ConstantProperty(new Color(0, 0, 0, 0));
        var iconKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <IconStyle>\
                <color>00000000</color>\
                <colorMode>normal</colorMode>\
                <scale>1.1</scale>\
                <heading>-90</heading>\
                <Icon>\
                    <href>http://maps.google.com/mapfiles/kml/pal3/icon21.png</href>\
                </Icon>\
               </IconStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(iconKml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].billboard.scale.getValue()).toEqual(scale.getValue());
        expect(entities[0].billboard.color).toEqual(color);
        expect(entities[0].billboard.rotation.getValue()).toEqual(Math.PI / 2.0);
        expect(entities[0].billboard.alignedAxis.getValue()).toEqual(Cartesian3.UNIT_Z);
        expect(entities[0].billboard.subRegion).toBeUndefined();
    });

    it('handles IconStyle with sub region', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2"\
                xmlns:gx="http://www.google.com/kml/ext/2.2">\
                    <Placemark>\
                      <Style>\
                        <IconStyle>\
                          <Icon>\
                            <href>whiteShapes.png</href>\
                            <gx:x>49</gx:x>\
                            <gx:y>43</gx:y>\
                            <gx:w>18</gx:w>\
                            <gx:h>18</gx:h>\
                          </Icon>\
                        </IconStyle>\
                      </Style>\
                    </Placemark>\
              </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));
        var billboard = dataSource.entities.values[0].billboard;
        expect(billboard.image.getValue()).toEqual('whiteShapes.png');
        expect(billboard.imageSubRegion.getValue()).toEqual(new BoundingRectangle(49, 43, 18, 18));
    });

    it('handles empty IconStyle element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Style>\
                <IconStyle>\
                </IconStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        var billboard = entities[0].billboard;
        expect(billboard).toBeDefined();
    });

    it('handles LabelStyle', function() {
        var scale = new ConstantProperty(1.5);
        var color = new ConstantProperty(new Color(0, 0, 0, 0));
        var iconKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
                <LabelStyle>\
                    <color>00000000</color>\
                    <colorMode>normal</colorMode>\
                    <scale>1.5</scale>\
                </LabelStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(iconKml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].label.scale.getValue()).toEqual(scale.getValue());
        expect(entities[0].label.fillColor).toEqual(color);
    });

    it('handles empty LabelStyle element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Style>\
                <LabelStyle>\
                </LabelStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].label).toBeDefined();
    });

    it('handles LineStyle', function() {
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2"\
             xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Document>\
            <Style id="testStyle">\
            <LineStyle>\
                <color>000000ff</color>\
                <width>4</width>\
                <gx:labelVisibility>1</gx:labelVisibility>\
                <gx:labelVisibility>0</gx:labelVisibility>\
            </LineStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

//        <gx:outerColor>ffffffff</gx:outerColor>\
//        <gx:outerWidth>1.0</gx:outerWidth>\
//        <gx:physicalWidth>0.0</gx:physicalWidth>\

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(lineKml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].polyline.width.getValue()).toEqual(4);
//        expect(entities[0].polyline.material.outlineWidth.getValue()).toEqual(1);
    });

    it('handles empty LineStyle element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Style>\
                <LineStyle>\
                </LineStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        var polyline = entities[0].polyline;
        expect(polyline).toBeDefined();
    });

    xit('LineStyle throws with invalid outerWidth', function() {
        var lineKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2"\
             xmlns:gx="http://www.google.com/kml/ext/2.2">\
            <Document>\
            <Placemark>\
              <Style>\
                <LineStyle>\
                    <gx:outerWidth>1.1</gx:outerWidth>\
                </LineStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var error;
        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(lineKml, 'text/xml')).otherwise(function(e) {
            error = e;
        });

        waitsFor(function() {
            return error instanceof RuntimeError;
        });
    });

    it('handles PolyStyle', function() {
        var color = new Color(1, 0, 0, 0);
        var polyKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
                <PolyStyle>\
                    <color>000000ff</color>\
                    <colorMode>normal</colorMode>\
                    <fill>1</fill>\
                    <outline>1</outline>\
                </PolyStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(polyKml, "text/xml"));

        var entities = dataSource.entities.values;
        var polygon = entities[0].polygon;
        var material = polygon.material.getValue();
        var generatedColor = material.color;
        expect(entities.length).toEqual(1);
        expect(generatedColor.red).toEqual(color.red);
        expect(generatedColor.green).toEqual(color.green);
        expect(generatedColor.blue).toEqual(color.blue);
        expect(generatedColor.alpha).toEqual(color.alpha);
    });

    it('handles empty PolyStyle element', function() {
        var kml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
              <Style>\
                <PolyStyle>\
                </PolyStyle>\
              </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(kml, "text/xml"));

        var entities = dataSource.entities.values;
        expect(entities.length).toEqual(1);
        expect(entities[0].polygon).toBeDefined();
    });

    it('handles Color in normal mode', function() {
        var color = new Color(1, 0, 0, 1);
        var colorKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <IconStyle>\
                <color>ff0000ff</color>\
                <colorMode>normal</colorMode>\
            </IconStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(colorKml, "text/xml"));

        var entities = dataSource.entities.values;
        var generatedColor = entities[0].billboard.color.getValue();
        expect(entities.length).toEqual(1);
        expect(generatedColor.red).toEqual(color.red);
        expect(generatedColor.green).toEqual(color.green);
        expect(generatedColor.blue).toEqual(color.blue);
        expect(generatedColor.alpha).toEqual(color.alpha);
    });

    it('handles Color in random mode', function() {
        var color = new Color(1, 0, 0, 1);
        var colorKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Style id="testStyle">\
            <IconStyle>\
                <color>ff0000ff</color>\
                <colorMode>random</colorMode>\
            </IconStyle>\
            </Style>\
            <Placemark>\
            <styleUrl>#testStyle</styleUrl>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(colorKml, "text/xml"));

        var entities = dataSource.entities.values;
        var generatedColor = entities[0].billboard.color.getValue();
        expect(entities.length).toEqual(1);
        expect(generatedColor.red <= color.red).toBe(true);
        expect(generatedColor.green).toEqual(color.green);
        expect(generatedColor.blue).toEqual(color.blue);
        expect(generatedColor.alpha).toEqual(color.alpha);
    });

    it('handles image path properly', function() {
        var pathKml = '<?xml version="1.0" encoding="UTF-8"?>\
            <kml xmlns="http://www.opengis.net/kml/2.2">\
            <Document>\
            <Placemark>\
            <Style>\
            <IconStyle>\
            <Icon>\
                <href>images/Earth_Station.png</href>\
            </Icon>\
            </IconStyle>\
            </Style>\
            </Placemark>\
            </Document>\
            </kml>';

        var dataSource = new KmlDataSource();
        dataSource.load(parser.parseFromString(pathKml, "text/xml"), 'http://test.invalid');

        var entities = dataSource.entities.values;
        var billboard = entities[0].billboard;
        expect(billboard.image.getValue()).toEqual('http://test.invalid/images/Earth_Station.png');
    });
});