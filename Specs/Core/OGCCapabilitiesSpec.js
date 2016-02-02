/*global defineSuite*/
defineSuite([
        'Core/OGCCapabilities'
    ], function(
        OGCCapabilities) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('Tests of OGCCapabilities.dimensionValidator with ISO8601 dimension', function() {
        var dimension={Identifier:"time",UOM:"ISO8601",Default:"2001-01-03T01:15:30",Value:
            ["2030-01-05,2999-11-27,2100-07-29","1980-01-01/2010-12-31/P10DT0H0M0S,1960-01-01/1970-12-31/P1D"]};

        var toValidatesTrue=["2999-11-27","1980-01-21","1965-07-01"];

        var toValidatesFalse=["2979-11-27","1980-07-03","1965-07-01T10:00:00"];

        toValidatesTrue.forEach(function(elt){
            expect(OGCCapabilities.dimensionValidator(dimension,elt)).toEqual(true);
        });

        toValidatesFalse.forEach(function(elt){
            expect(OGCCapabilities.dimensionValidator(dimension,elt)).toEqual(false);
        });
    });

    it('Tests of OGCCapabilities.dimensionValidator with dimension different of ISO8601', function() {
        var dimensionFalseTime={Identifier:"times",UOM:"ISO",Default:"2001-01-03T01:15:30",Value:
            ["2030-01-05,2999-11-27,2100-07-29","1980-01-01/2010-12-31/P10DT0H0M0S,1960-01-01/1970-12-31/P1D"]};

        var toValidatesTrueTime=["2999-11-27","2030-01-05","2100-07-29"];

        var toValidatesFalseTime=["2979-11-27","1980-01-21","1980-07-03"];

        toValidatesTrueTime.forEach(function(elt){
            expect(OGCCapabilities.dimensionValidator(dimensionFalseTime,elt)).toEqual(true);
        });

        toValidatesFalseTime.forEach(function(elt){
            expect(OGCCapabilities.dimensionValidator(dimensionFalseTime,elt)).toEqual(false);
        });

        var dimensionElevation={Identifier:"elevation",UOM:"m",Default:"100",Value:
            ["10,20,30,40","300/1000/30,2000/5000/100"]};

        var toValidatesTrueElevation=["10","20","30","40","300","660","2300",5000];

        var toValidatesFalseElevation=["16","200","1000",2101];

        toValidatesTrueElevation.forEach(function(elt){
            expect(OGCCapabilities.dimensionValidator(dimensionElevation,elt)).toEqual(true);
        });

        toValidatesFalseElevation.forEach(function(elt){
            expect(OGCCapabilities.dimensionValidator(dimensionElevation,elt)).toEqual(false);
        });

    });
});