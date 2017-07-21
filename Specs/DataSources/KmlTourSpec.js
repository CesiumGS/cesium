/*global defineSuite*/
defineSuite([
        'DataSources/KmlTour',
        'DataSources/KmlTourFlyTo',
        'DataSources/KmlTourWait',
        'DataSources/KmlCamera',
        'DataSources/KmlLookAt',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Core/Math'
    ], function(
        KmlTour,
        KmlTourFlyTo,
        KmlTourWait,
        KmlCamera,
        KmlLookAt,
        Cartesian3,
        HeadingPitchRange,
        CesiumMath
        ) {
    'use strict';

    function getLookAt() {
        var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
        var hpr = new HeadingPitchRange(
            CesiumMath.toRadians(10.0),
            CesiumMath.toRadians(45.0),
            10000);
        return new KmlLookAt(position, hpr);
    }

    function createMockViewer() {
        var mockViewer = {};
        mockViewer.scene = {};
        mockViewer.scene.camera = {};
        mockViewer.scene.camera.flyTo = jasmine.createSpy('flyTo');
        mockViewer.scene.camera.flyToBoundingSphere = jasmine.createSpy('flyToBoundingSphere');
        return mockViewer;
    }

    it('add entries to playlist', function() {
        var tour = new KmlTour('test', 'test');
        var wait = new KmlTourWait(10);
        var flyTo = new KmlTourFlyTo(5, null, getLookAt());
        tour.addPlaylistEntry(wait);
        tour.addPlaylistEntry(flyTo);

        expect(tour.playlist.length).toEqual(2);
        expect(tour.playlist[0]).toBe(wait);
        expect(tour.playlist[1]).toBe(flyTo);
    });

    it('calls entries play', function() {
        var tour = new KmlTour('test', 'test');
        var wait = new KmlTourWait(0.1);
        var flyTo = new KmlTourFlyTo(0.1, null, getLookAt());
        tour.addPlaylistEntry(wait);
        tour.addPlaylistEntry(flyTo);

        var waitSpy = spyOn(wait, 'play').and.callThrough();
        var flySpy = spyOn(flyTo, 'play').and.callThrough();

        var mockViewer = createMockViewer();
        tour.play(mockViewer);
        setTimeout(function() {
            expect(waitSpy).toHaveBeenCalled();
            expect(flySpy).toHaveBeenCalled();
            expect(mockViewer.scene.camera.flyToBoundingSphere).toHaveBeenCalled();
        }, 250);
    });

    it('calls events', function(){
        var tour = new KmlTour('test', 'test');
        var wait = new KmlTourWait(0.1);
        var flyTo = new KmlTourFlyTo(0.1, null, getLookAt());

        var tourStart = jasmine.createSpy('TourStart');
        var tourEnd = jasmine.createSpy('TourEnd');
        var entryStart = jasmine.createSpy('EntryStart');
        var entryEnd = jasmine.createSpy('EntryEnd');

        tour.addPlaylistEntry(wait);
        tour.addPlaylistEntry(flyTo);

        tour.tourStart.addEventListener(tourStart);
        tour.tourEnd.addEventListener(tourEnd);
        tour.entryStart.addEventListener(entryStart);
        tour.entryEnd.addEventListener(entryEnd);

        tour.play(createMockViewer());
        setTimeout(function() {
            expect(tourStart).toHaveBeenCalled();
            expect(tourEnd).toHaveBeenCalledWith(false);
            expect(entryStart).toHaveBeenCalled();
            expect(entryEnd).toHaveBeenCalled();
        }, 250);
    });

    it('terminates playback', function(){
        var tour = new KmlTour('test', 'test');
        var wait = new KmlTourWait(60);
        var flyTo = new KmlTourFlyTo(0.1, null, getLookAt());

        var tourStart = jasmine.createSpy('TourStart');
        var tourEnd = jasmine.createSpy('TourEnd');
        var entryStart = jasmine.createSpy('EntryStart');
        var entryEnd = jasmine.createSpy('EntryEnd');

        tour.addPlaylistEntry(wait);
        tour.addPlaylistEntry(flyTo);

        tour.tourStart.addEventListener(tourStart);
        tour.tourEnd.addEventListener(tourEnd);
        tour.entryStart.addEventListener(entryStart);
        tour.entryEnd.addEventListener(entryEnd);

        var mockViewer = createMockViewer();
        tour.play(mockViewer);
        setTimeout(function() {
            tour.stop();
            expect(tourStart).toHaveBeenCalled();
            // Wait entry have been started
            expect(entryStart).toHaveBeenCalledWith(wait);
            // Wait entry have been terminated
            expect(entryEnd).toHaveBeenCalledWith(wait, true);
            expect(tourEnd).toHaveBeenCalledWith(true);

            expect(entryStart.calls.count()).toEqual(1);
            expect(entryEnd.calls.count()).toEqual(1);
            expect(tourStart.calls.count()).toEqual(1);
            expect(tourEnd.calls.count()).toEqual(1);

            expect(mockViewer.scene.camera.flyTo.calls.count()).toEqual(0);
            expect(mockViewer.scene.camera.flyToBoundingSphere.calls.count()).toEqual(0);
        }, 5);
    });
});
