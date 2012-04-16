(function() {
    "use strict";
    /*global Sandbox*/

    Sandbox.CentralBodyShowClouds = function (cb) {
        this.code = function () {
            cb.showClouds = true;
            cb.showCloudShadows = true;
        };
    };

    Sandbox.CentralBodyHideClouds = function (cb) {
        this.code = function () {
            cb.showClouds = false;
            cb.showCloudShadows = false;
        };
    };

    Sandbox.CentralBodyShowCloudShadows = function (cb) {
        this.code = function () {
            cb.showCloudShadows = true;
        };
    };

    Sandbox.CentralBodyHideCloudShadows = function (cb) {
        this.code = function () {
            cb.showCloudShadows = false;
        };
    };

    Sandbox.CentralBodyShowBumps = function (cb) {
        this.code = function () {
            cb.showBumps = true;
        };
    };

    Sandbox.CentralBodyHideBumps = function (cb) {
        this.code = function () {
            cb.showBumps = false;
        };
    };

    Sandbox.CentralBodyShowSpecular = function (cb) {
        this.code = function () {
            cb.showSpecular = true;
        };
    };

    Sandbox.CentralBodyHideSpecular = function (cb) {
        this.code = function () {
            cb.showSpecular = false;
        };
    };

    Sandbox.CentralBodyShowSkyAtmosphere = function (cb) {
        this.code = function () {
            cb.showSkyAtmosphere = true;
        };
    };

    Sandbox.CentralBodyHideSkyAtmosphere = function (cb) {
        this.code = function () {
            cb.showSkyAtmosphere = false;
        };
    };

    Sandbox.CentralBodyShowGroundAtmosphere = function (cb) {
        this.code = function () {
            cb.showGroundAtmosphere = true;
        };
    };

    Sandbox.CentralBodyHideGroundAtmosphere = function (cb) {
        this.code = function () {
            cb.showGroundAtmosphere = false;
        };
    };
}());