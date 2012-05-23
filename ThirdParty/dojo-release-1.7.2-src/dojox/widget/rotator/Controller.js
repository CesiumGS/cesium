dojo.provide("dojox.widget.rotator.Controller");

(function(d){

	var _dojoxRotator = "dojoxRotator",
		_play = _dojoxRotator + "Play",
		_pause = _dojoxRotator + "Pause",
		_number = _dojoxRotator + "Number",
		_tab = _dojoxRotator + "Tab",
		_selected = _dojoxRotator + "Selected";

	d.declare("dojox.widget.rotator.Controller", null, {
		//	summary:
		//		A controller that manipulates a Rotator or AutoRotator.
		//
		//	description:
		//		Displays a series of controls that send actions to a Rotator or
		//		AutoRotator.  The Controller supports the following controls:
		//
		//		* Next pane
		//		* Previous pane
		//		* Play/Pause toggler
		//		* Numbered tabs
		//		* Titled tabs
		//		* Information
		//
		//		You may specify any of these controls in any order.  You may also
		//		have multiple Controllers tied to a single Rotator instance.
		//
		//		The Controller's DOM node may also be styled for positioning or
		//		other styled preferences.
		//
		//	example:
		//	|	<div dojoType="dojox.widget.rotator.Controller"
		//	|		rotator="myRotator"
		//	|	></div>
		//
		//	example:
		//	|	<div dojoType="dojox.widget.rotator.Controller"
		//	|		rotator="myRotator"
		//	|		controls="prev,#,next"
		//	|		class="myCtrl"
		//	|	></div>
		//
		//	example:
		//	|	<div dojoType="dojox.widget.rotator.Controller"
		//	|		rotator="myRotator"
		//	|		controls="titles"
		//	|		class="myCtrl"
		//	|	></div>s

		//	rotator: dojox.widget.Rotator
		//		An instance of a Rotator widget.
		rotator: null,

		//	commands: string
		//		A comma-separated list of commands. Valid commands are:
		//		  prev			An icon button to go to the previous pane.
		//		  next			An icon button to go to the next pane.
		//		  play/pause	A play and pause toggle icon button.
		//		  info			Displays the current and total panes. (ie "1 / 4")
		//		  #				Displays a number button for each pane. (ie "1 2 3 4")
		//		  titles		Displays each pane's title as a tab. (ie "Home Services Contact Blog")
		commands: "prev,play/pause,info,next",

		constructor: function(/*Object*/params, /*DomNode|string*/node){
			//	summary:
			//		Initializes the pager and connect to the rotator.

			d.mixin(this, params);

			// check if we have a valid rotator
			var r = this.rotator;
			if(r){
				// remove all of the controller's child nodes just in case
				while(node.firstChild){
					node.removeChild(node.firstChild);
				}

				var ul = this._domNode = d.create("ul", null, node),
					icon = " " + _dojoxRotator + "Icon",

					// helper function for creating a button
					cb = function(/*string*/label, /*string*/css, /*array*/action){
						d.create("li", {
							className: css,
							innerHTML: '<a href="#"><span>' + label + '</span></a>',
							onclick: function(/*event*/e){
								d.stopEvent(e);
								if(r){
									r.control.apply(r, action);
								}
							}
						}, ul);
					};

				// build out the commands
				d.forEach(this.commands.split(','), function(b, i){
					switch(b){
						case "prev":
							cb("Prev", _dojoxRotator + "Prev" + icon, ["prev"]);
							break;
						case "play/pause":
							cb("Play", _play + icon, ["play"]);
							cb("Pause", _pause + icon, ["pause"]);
							break;
						case "info":
							this._info = d.create("li", {
								className: _dojoxRotator + "Info",
								innerHTML: this._buildInfo(r)
							}, ul);
							break;
						case "next":
							cb("Next", _dojoxRotator + "Next" + icon, ["next"]);
							break;
						case "#":
						case "titles":
							for(var j=0; j<r.panes.length; j++){
								cb(
									/*label*/ b == '#' ? j+1 : r.panes[j].title || "Tab " + (j+1),
									/*css*/ (b == '#' ? _number : _tab) + ' ' + (j == r.idx ? _selected : "") + ' ' + _dojoxRotator + "Pane" + j,
									/*action*/ ["go", j]
								);
							}
							break;
					}
				}, this);

				// add the first/last classes for styling
				d.query("li:first-child", ul).addClass(_dojoxRotator + "First");
				d.query("li:last-child", ul).addClass(_dojoxRotator + "Last");

				// set the initial state of the play/pause toggle button
				this._togglePlay();

				this._con = d.connect(r, "onUpdate", this, "_onUpdate");
			}
		},

		destroy: function(){
			//	summary:
			//		Disconnect from the rotator.
			d.disconnect(this._con);
			d.destroy(this._domNode);
		},

		_togglePlay: function(/*boolean*/playing){
			//	summary:
			//		Toggles the play/pause button, if it exists.

			var p = this.rotator.playing;
			d.query('.'+_play, this._domNode).style("display", p ? "none" : "");
			d.query('.'+_pause, this._domNode).style("display", p ? "" : "none");
		},

		_buildInfo: function(/*dojox.widget.Rotator*/r){
			//	summary:
			//		Return a string containing the current pane number and the total number of panes.
			return '<span>' + (r.idx+1) + ' / ' + r.panes.length + '</span>'; /*string*/
		},

		_onUpdate: function(/*string*/type){
			//	summary:
			//		Updates various pager controls when the rotator updates.

			var r = this.rotator; // no need to test if this is null since _onUpdate is only fired by the rotator

			switch(type){
				case "play":
				case "pause":
					this._togglePlay();
					break;
				case "onAfterTransition":
					if(this._info){
						this._info.innerHTML = this._buildInfo(r);
					}

					// helper function for selecting the current tab
					var s = function(/*NodeList*/n){
						if(r.idx < n.length){
							d.addClass(n[r.idx], _selected);
						}
					};

					s(d.query('.' + _number, this._domNode).removeClass(_selected));
					s(d.query('.' + _tab, this._domNode).removeClass(_selected));
					break;
			}
		}
	});

})(dojo);