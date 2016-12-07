function TourPlayer(viewer, datasource) {
    this.datasource = datasource;
    this.viewer = viewer;
    this.playIndex = 0;
    if(this.datasource.kml && this.datasource.kml.tour) {
        this.tour = this.datasource.kml.tour;
    }
}

TourPlayer.prototype.play = function() {
    if(this.tour) {
        
    }
};
