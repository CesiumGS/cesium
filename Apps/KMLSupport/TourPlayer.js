
function TourPlayer(viewer, datasource) {
  this.datasource = datasource;
  this.viewer = viewer;
  this.activeScenePlayer = null;

  if(this.datasource && this.datasource.kmlTour) {
    this.tour = this.datasource.kmlTour;
    this.playlist = this.tour.playlist;
  }

  this.players = {
    'Wait': WaitPlayer,
    'FlyTo': FlyToPlayer
  };
}

TourPlayer.prototype.play = function(done) {
  if(this.playlist) {
    var self = this;
    chainPlaylist(this.playlist, this.playEntry.bind(this), function() {
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
      if (!entry.done) {
        var v = entry.value;
        onEach(v[0], v[1], next);
      }
      // We've done
      else {
        cleanup();
        done();
      }
    }
    // User brakes the loop
    else {
      cleanup();
    }
  }

  // Make a first step
  next();

  function cleanup() {
    delete generator;
    delete next;
  }

  function* generate(playlist) {
    for (var i = 0; i < playlist.length; i++) {
      yield [playlist[i], i];
    }
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
  this.camera = context.player.viewer.camera;
}

FlyToPlayer.prototype.play = function() {
  var lookAt = this.scene.lookAt;
  var target = lookAt.getBoundingSphere();
  var offset = lookAt.getHeadingPitchRangeCameraOffset();

  this.camera.flyToBoundingSphere(target, {
    offset: offset,
    duration: this.scene.duration,
    complete: this.done
  });
};
