define([
        '../Core/defined',
        '../Core/Event'
    ], function(
        defined,
        Event) {
    'use strict';
    /**
     * @alias KmlTour
     * @constructor
     *
     * @param {String} name name parsed from KML
     * @param {String} id id parsed from KML
     * @param {Array} playlist array with KMLTourFlyTos, KMLTourWaits and KMLTourSoundCues
     */
    function KmlTour(name, id) {
        /**
         * Id of kml gx:Tour entry
         * @type String
         */
        this.id = id;
        /**
         * Tour name
         * @type String
         */
        this.name = name;
        /**
         * Index of current entry from playlist
         * @type Number
         */
        this.playlistIndex = 0;
        /**
         * Array of playlist entries
         * @type Array
         */
        this.playlist = [];
        /**
         * Event will be called when tour starts to play,
         * before any playlist entry starts to play.
         * @type Event
         */
        this.tourStart = new Event();
        /**
         * Event will be called when all playlist entries are
         * played, or tour playback being canceled.
         *
         * If tour playback was terminated, event callback will
         * be called with terminated=true parameter.
         * @type Event
         */
        this.tourEnd = new Event();
        /**
         * Event will be called when entry from playlist starts to play.
         *
         * Event callback will be called with curent entry as first parameter.
         * @type Event
         */
        this.entryStart = new Event();
        /**
         * Event will be called when entry from playlist ends to play.
         *
         * Event callback will be called with following parameters:
         * 1. entry - entry
         * 2. terminated - true if playback was terminated by calling {@link KmlTour#stop}
         * @type Event
         */
        this.entryEnd = new Event();

        this._activeEntries = [];
    }

    /**
     * Add entry to this tour playlist.
     *
     * @param {KmlTourFlyTo|KmlTourWait} entry an entry to add to the playlist.
     */
    KmlTour.prototype.addPlaylistEntry = function(entry) {
        this.playlist.push(entry);
    };

    /**
     * Play this tour.
     *
     * @param {Viewer} viewer viewer widget.
     * @param {Object} [cameraOptions] these options will be merged with {@link Camera#flyTo}
     * options for FlyTo playlist entries.
     */
    KmlTour.prototype.play = function(viewer, cameraOptions) {
        this.tourStart.raiseEvent();

        var tour = this;
        playEntry.call(this, viewer, cameraOptions, function(terminated) {
            tour.playlistIndex = 0;
            // Stop nonblocking entries
            if (!terminated) {
                cancelAllEntries(tour._activeEntries);
            }
            tour.tourEnd.raiseEvent(terminated);
        });
    };

    /**
     * Stop curently playing tour.
     */
    KmlTour.prototype.stop = function() {
        cancelAllEntries(this._activeEntries);
    };

    /**
     * Stop all activeEntries.
     * @param {Array} activeEntries
     */
    function cancelAllEntries(activeEntries) {
        for(var entry = activeEntries.pop(); entry !== undefined; entry = activeEntries.pop()) {
            entry.stop();
        }
    }

    /**
     * Play playlist entry.
     * This function is called recursevly with playNext
     * and iterates over all entries from playlist.
     *
     * @param {ViewerWidget} viewer Cesium viewer.
     * @param {Object} cameraOptions see {@link Camera#flyTo}.
     * @param {Function} allDone a function will be called when all entries from playlist
     * being played or user call {@link KmlTour#stop}.
     */
    function playEntry(viewer, cameraOptions, allDone) {
        var entry = this.playlist[this.playlistIndex];
        if (entry) {
            var _playNext = playNext.bind(this, viewer, cameraOptions, allDone);
            this._activeEntries.push(entry);
            this.entryStart.raiseEvent(entry);
            if (entry.blocking) {
                entry.play(_playNext, viewer.scene.camera, cameraOptions);
            }
            else {
                var tour = this;
                entry.play(function() {
                    tour.entryEnd.raiseEvent(entry);
                    var indx = tour._activeEntries.indexOf(entry);
                    if (indx >= 0) {
                        tour._activeEntries.splice(indx, 1);
                    }
                });
                _playNext(viewer, cameraOptions, allDone);
            }
        }
        else if(defined(allDone)) {
            allDone(false);
        }
    }

    /**
     * Increment playlistIndex and call playEntry
     * if terminated isn't true.
     *
     * @param {ViewerWidget} viewer passed for recursion.
     * @param {Object} cameraOptions passed for recursion.
     * @param {Function} allDone passed for recursion.
     * @param {Boolean} terminated true if active entry was terminated,
     * and the whole tour should be terminated.
     */
    function playNext(viewer, cameraOptions, allDone, terminated) {
        var entry = this.playlist[this.playlistIndex];
        this.entryEnd.raiseEvent(entry, terminated);

        if (terminated) {
            allDone(terminated);
        }
        else {
            var indx = this._activeEntries.indexOf(entry);
            if (indx >= 0) {
                this._activeEntries.splice(indx, 1);
            }
            this.playlistIndex++;
            playEntry.call(this, viewer, cameraOptions, allDone);
        }
    }

    return KmlTour;
});
