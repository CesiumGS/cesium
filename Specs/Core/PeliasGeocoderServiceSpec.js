import { Cartesian3 } from '../../Source/Cesium.js';
import { GeocodeType } from '../../Source/Cesium.js';
import { PeliasGeocoderService } from '../../Source/Cesium.js';
import { Resource } from '../../Source/Cesium.js';
import { when } from '../../Source/Cesium.js';

describe('Core/PeliasGeocoderService', function() {

    it('constructor throws without url', function() {
        expect(function() {
            return new PeliasGeocoderService(undefined);
        }).toThrowDeveloperError();
    });

    it('returns geocoder results', function () {
        var service = new PeliasGeocoderService('http://test.invalid/v1/');

        var query = 'some query';
        var data = {
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-75.172489, 39.927828]
                },
                properties: {
                    label: '1826 S 16th St, Philadelphia, PA, USA'
                }
            }]
        };
        spyOn(Resource.prototype, 'fetchJson').and.returnValue(when.resolve(data));

        return service.geocode(query)
            .then(function(results) {
                expect(results.length).toEqual(1);
                expect(results[0].displayName).toEqual(data.features[0].properties.label);
                expect(results[0].destination).toBeInstanceOf(Cartesian3);
            });
    });

    it('returns no geocoder results if Pelias has no results', function() {
        var service = new PeliasGeocoderService('http://test.invalid/v1/');

        var query = 'some query';
        var data = { features: [] };
        spyOn(Resource.prototype, 'fetchJson').and.returnValue(when.resolve(data));

        return service.geocode(query)
            .then(function(results) {
                expect(results.length).toEqual(0);
            });
    });

    it('calls search endpoint if specified', function () {
        var service = new PeliasGeocoderService('http://test.invalid/v1/');

        var query = 'some query';
        var data = { features: [] };
        spyOn(Resource.prototype, 'fetchJson').and.returnValue(when.resolve(data));
        var getDerivedResource = spyOn(service._url, 'getDerivedResource').and.callThrough();

        service.geocode(query, GeocodeType.SEARCH);
        expect(getDerivedResource).toHaveBeenCalledWith({
            url: 'search',
            queryParameters: {
                text: query
            }
        });
    });

    it('calls autocomplete endpoint if specified', function () {
        var service = new PeliasGeocoderService('http://test.invalid/v1/');

        var query = 'some query';
        var data = { features: [] };
        spyOn(Resource.prototype, 'fetchJson').and.returnValue(when.resolve(data));
        var getDerivedResource = spyOn(service._url, 'getDerivedResource').and.callThrough();

        service.geocode(query, GeocodeType.AUTOCOMPLETE);
        expect(getDerivedResource).toHaveBeenCalledWith({
            url: 'autocomplete',
            queryParameters: {
                text: query
            }
        });
    });
});
