/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './TimeConstants',
        './Ellipsoid'
    ],
    function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Matrix3,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        TimeConstants,
        Ellipsoid) {
    "use strict";

    var EarthOrientationData = {

            eop : [],

            clear : function(){
                EarthOrientationData.eop = [];
            },

            computeOrientationParameters : function (dateTai){

                //if(this.eop.length !== 0){
                    return EarthOrientationData.eop[0];
//                }
//                else {
                    //return new OrientationParameterData(0,0,0,0,0);
//                }
            },

            OrientationParameterData : function(xVal, yVal, ut1MinusUtc, xPoleOffset, yPoleOffset){
                this.xPoleWander = xVal;
                this.yPoleWander = yVal;
                this.ut1MinusUtc = ut1MinusUtc;
                this.xPoleOffset = xPoleOffset;
                this.yPoleOffset = yPoleOffset;
                //this.lengthOfDayCorrection
                //this.deltaPsiCorrection
                //this.deltaEpsilonCorrection
            }
    };

    return EarthOrientationData;
});