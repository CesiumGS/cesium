/*global defineSuite*/
defineSuite([
        'DataSources/KmlTour',
        'DataSources/KmlTourFlyTo',
        'DataSources/KmlTourWait',
        'DataSources/KmlCamera',
        'DataSources/KmlLookAt',
        'Core/Cartesian3',
        'Core/HeadingPitchRange'
    ], function(
        KmlTour,
        KmlTourFlyTo,
        KmlTourWait,
        KmlCamera,
        KmlLookAt,
        Cartesian3,
        HeadingPitchRange
        ) {
    'use strict';

    function getLookAt() {
        var position = Cartesian3.fromDegrees(40.0, 30.0, 1000);
        var hpr = HeadingPitchRange.fromDegrees(10.0, 45.0, 10000);
        return new KmlLookAt(position, hpr);
    }

    function createMockViewer() {
        var mockViewer = {};
        mockViewer.scene = {};
        mockViewer.scene.camera = {};
        spyOn(mockViewer.scene.camera, 'flyTo');
        spyOn(mockViewer.scene.camera, 'flyToBoundingSphere');
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

        spyOn(wait, 'play');
        spyOn(flyTo, 'play');

        tour.addPlaylistEntry(wait);
        tour.addPlaylistEntry(flyTo);

        tour.play(createMockViewer());
        setTimeout(function(){
            expect(wait.play).toHaveBeenCalled();
            expect(flyTo.play).toHaveBeenCalled();
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

        var mockViewer = {};
        mockViewer.scene = {};
        mockViewer.scene.camera = {};
        spyOn(mockViewer.scene.camera, 'flyTo');
        spyOn(mockViewer.scene.camera, 'flyToBoundingSphere');

        tour.play(createMockViewer());
        setTimeout(function(){
            expect(tourStart).toHaveBeenCalled();
            expect(tourEnd).toHaveBeenCalled();
            expect(entryStart).toHaveBeenCalled();
            expect(entryEnd).toHaveBeenCalled();
        }, 250);

    });
});
