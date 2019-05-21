defineSuite([
    'DataSources/KmlExporter',
    'Core/Cartesian3',
    'Core/PerspectiveFrustum',
    'Core/Rectangle',
    'DataSources/KmlDataSource',
    'Specs/pollToPromise'
], function(
    KmlExporter,
    Cartesian3,
    PerspectiveFrustum,
    Rectangle,
    KmlDataSource,
    pollToPromise) {
'use strict';

    function download(filename, data) {
        var blob = new Blob([data], {type: 'application/xml'});
        if(window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename);
        } else {
            var elem = window.document.createElement('a');
            elem.href = window.URL.createObjectURL(blob);
            elem.download = filename;
            document.body.appendChild(elem);
            elem.click();
            document.body.removeChild(elem);
        }
    }

    var options = {
        camera : {
            positionWC : new Cartesian3(0.0, 0.0, 0.0),
            directionWC : new Cartesian3(0.0, 0.0, 1.0),
            upWC : new Cartesian3(0.0, 1.0, 0.0),
            pitch : 0.0,
            heading : 0.0,
            frustum : new PerspectiveFrustum(),
            computeViewRectangle : function() {
                return Rectangle.MAX_VALUE;
            },
            pickEllipsoid : function() {
                return undefined;
            }
        },
        canvas : {
            clientWidth : 512,
            clientHeight : 512
        }
    };

    it('test', function() {
        return KmlDataSource.load('../Apps/SampleData/kml/facilities/facilities.kml', options)
            .then(function(datasource) {
                var exporter = new KmlExporter(datasource.entities);

                var kml = exporter.toString();
                download('test.kml', kml);
            });
    });

});
