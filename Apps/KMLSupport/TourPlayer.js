
function TourPlayer(viewer, datasource) {
  this.datasource = datasource;
  this.viewer = viewer;
  this.activeScenePlayer = null;

  if(this.datasource.kml && this.datasource.kmlTour) {
    this.tour = this.datasource.kmlTour;
    this.playlist = this.tour.playlist;
  }

  this.playEntry.bind(this);
  this.playWait.bind(this);
  this.playFlyTo.bind(this);

  this.players = {
    'Wait': WaitPlayer,
    'FlyTo': FlyToPlayer
  };
}

TourPlayer.prototype.play = function(done) {
  if(this.playlist) {
    var self = this;
    chainPlaylist(this.playlist, this.playEntry, function(){
      // Clean player
      self.activeScenePlayer = null;
      done && done();
    });
  }
};

TourPlayer.prototype.playEntry = function(entry, index, next) {
  var PlayerConstructor = this.players[entry._type];
  var context = {
    player: this,
    playlist: this.playlist,
    index: index
  };
  this.activeScenePlayer = new PlayerConstructor(entry, next, context);
  this.activeScenePlayer.play();
};

/*
Asynchronous array iterator
*/
function chainPlaylist(playlist, onEach, done) {
  var generator = generate(playlist);

  var next = function(success) {
    if (success === undefined || success) {
      var entry = generator.next();
      onEach(entry[0], entry[1], next);
    }
    else {
      delete generator;
      delete next;
      return;
    }
  }

  function* generate(playlist) {
    for (var i = 0; i < playlist.length; i++) {
      yeld [playlist[i], i];
    }
    done();
  }
}

//------------------------------------------------------------
function WaitPlayer(scene, done, context) {
  this.scene = scene;
  this.done = done;
  this.context = context;
}

WaitPlayer.prototype.play = function() {
  // Just call the timeout
  this.timer = setTimeout(this.done, this.scene.duration);
}

//------------------------------------------------------------
function FlyToPlayer(scene, done, context) {
  this.scene = scene;
  this.done = done;
  this.context = context;
  this.camera = context.player.camera;
}

FlyToPlayer.prototype.play = function() {
  viewer.camera.flyTo({
    destination : Cesium.Cartesian3.fromDegrees(-122.19, 46.25, 5000.0),
    orientation : {
        heading : Cesium.Math.toRadians(175.0),
        pitch : Cesium.Math.toRadians(-35.0),
        roll : 0.0
    }
  });
}
