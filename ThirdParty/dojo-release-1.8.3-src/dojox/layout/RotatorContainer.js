define(["dojo/_base/declare","dojo/_base/html","dojo/_base/connect","dojo/_base/lang","dojo/_base/array",
	"dojo/_base/fx","dojo/fx","dijit/_base/manager","dijit/layout/StackContainer","dijit/layout/StackController","dijit/_Widget",
	"dijit/_Templated","dijit/_Contained"
],function(declare,html,connect,lang,array,baseFx,coreFx,manager,
	StackContainer,StackController,Widget,Templated,Contained){

var RotatorContainer = declare("dojox.layout.RotatorContainer",[StackContainer, Templated], {
	// summary:
	//		Extends a StackContainer to automatically transition between children
	//		and display navigation in the form of tabs or a pager.
	//
	// description:
	//		The RotatorContainer cycles through the children with a transition.
	//
	//		####published topics:
	//
	//		[widgetId]-update - Notifies pager(s) that a child has changed.
	//		Parameters:
	//
	//		- /*boolean*/ playing - true if playing, false if paused
	//		- /*int*/ current     - current selected child
	//		- /*int*/ total       - total number of children
	//
	// example:
	// |	<div dojoType="dojox.layout.RotatorContainer" id="myRotator" showTabs="true" autoStart="true" transitionDelay="5000">
	// |		<div id="pane1" dojoType="dijit.layout.ContentPane" title="1">
	// |			Pane 1!
	// |		</div>
	// |		<div id="pane2" dojoType="dijit.layout.ContentPane" title="2">
	// |			Pane 2!
	// |		</div>
	// |		<div id="pane3" dojoType="dijit.layout.ContentPane" title="3" transitionDelay="10000">
	// |			Pane 3 with overrided transitionDelay!
	// |		</div>
	// |	</div>

	templateString: '<div class="dojoxRotatorContainer"><div dojoAttachPoint="tabNode"></div><div class="dojoxRotatorPager" dojoAttachPoint="pagerNode"></div><div class="dojoxRotatorContent" dojoAttachPoint="containerNode"></div></div>',

	// showTabs: Boolean
	//		Sets the display of the tabs.  The tabs are actually a StackController.
	//		The child's title is used for the tab's label.
	showTabs: true,

	// transitionDelay: int
	//		The delay in milliseconds before transitioning to the next child.
	transitionDelay: 5000,

	// transition: String
	//		The type of transition to perform when switching children.
	//		A null transition will transition instantly.
	transition: "fade",

	// transitionDuration: int
	//		The duration of the transition in milliseconds.
	transitionDuration: 1000,

	// autoStart: Boolean
	//		Starts the timer to transition children upon creation.
	autoStart: true,

	// suspendOnHover: Boolean
	//		Pause the rotator when the mouse hovers over it.
	suspendOnHover: false,

	// pauseOnManualChange: Boolean
	//		Pause the rotator when the tab is changed or the pager's next/previous
	//		buttons are clicked.
	pauseOnManualChange: null,

	// reverse: Boolean
	//		Causes the rotator to rotate in reverse order.
	reverse: false,

	// pagerId: String
	//		ID the pager widget.
	pagerId: "",

	// cycles: int
	//		Number of cycles before pausing.
	cycles: -1,

	// pagerClass: String
	//		The declared Class of the Pager used for this Widget
 	pagerClass: "dojox.layout.RotatorPager",

	postCreate: function(){
		// summary:
		//		Initializes the DOM nodes, tabs, and transition stuff.
		this.inherited(arguments);

		// force this DOM node to a relative position and make sure the children are absolute positioned
		html.style(this.domNode, "position", "relative");

		// validate the cycles counter
		if(this.cycles-0 == this.cycles && this.cycles != -1){
			// we need to add 1 because we decrement cycles before the animation starts
			this.cycles++;
		}else{
			this.cycles = -1;
		}

		// if they didn't specify the pauseOnManualChange, then we want it to be the opposite of
		// the suspendOnHover since it doesn't make sense to do both, unless you really want to
		if(this.pauseOnManualChange === null){
			this.pauseOnManualChange = !this.suspendOnHover;
		}

		// create the stack controller if we are using tabs
		var id = this.id || "rotator"+(new Date()).getTime(),
			sc = new StackController({ containerId:id }, this.tabNode);
		this.tabNode = sc.domNode;
		this._stackController = sc;
		html.style(this.tabNode, "display", this.showTabs ? "" : "none");

		// if the controller's tabs are clicked, check if we should pause and reset the cycle counter
		this.connect(sc, "onButtonClick","_manualChange");

		// set up our topic listeners
		this._subscriptions = [
			connect.subscribe(this.id+"-cycle", this, "_cycle"),
			connect.subscribe(this.id+"-state", this, "_state")
		];

		// make sure the transition duration isn't less than the transition delay
		var d = Math.round(this.transitionDelay * 0.75);
		if(d < this.transitionDuration){
			this.transitionDuration = d;
		}

		// wire up the mouse hover events
		if(this.suspendOnHover){
			this.connect(this.domNode, "onmouseover", "_onMouseOver");
			this.connect(this.domNode, "onmouseout", "_onMouseOut");
		}
	},

	startup: function(){
		// summary:
		//		Initializes the pagers.
		if(this._started){ return; }

		// check if the pager is defined within the rotator container
		var c = this.getChildren();
		for(var i=0, len=c.length; i<len; i++){
			if(c[i].declaredClass == this.pagerClass){
				this.pagerNode.appendChild(c[i].domNode);
				break;
			}
		}

		// process the child widgets
		this.inherited(arguments);

		// check if we should start automatically
		if(this.autoStart){
			// start playing
			setTimeout(lang.hitch(this, "_play"), 10);
		}else{
			// update the pagers with the initial state
			this._updatePager();
		}
	},

	destroy: function(){
		// summary:
		//		Unsubscribe to all of our topics
		array.forEach(this._subscriptions, connect.unsubscribe);
		this.inherited(arguments);
	},

	_setShowTabsAttr: function(/*anything*/value){
		this.showTabs = value;
		html.style(this.tabNode, "display", value ? "" : "none");
	},

	_updatePager: function(){
		// summary:
		//		Notify the pager's current and total numbers.
		var c = this.getChildren();
		connect.publish(this.id+"-update", [this._playing, array.indexOf(c, this.selectedChildWidget)+1, c.length]);
	},

	_onMouseOver: function(){
		// summary:
		//		Triggered when the mouse is moved over the rotator container.

		// temporarily suspend the cycling, but don't officially pause it
		this._resetTimer();
		this._over = true;
	},

	_onMouseOut: function(){
		// summary:
		//		Triggered when the mouse is moved off the rotator container.
		this._over = false;

		// if we were playing, resume playback in 200ms
		// we need to wait because we may be moused over again right away
		if(this._playing){
			clearTimeout(this._timer);
			this._timer = setTimeout(lang.hitch(this, "_play", true), 200);
		}
	},

	_resetTimer: function(){
		// summary:
		//		Resets the timer used to start the next transition.
		clearTimeout(this._timer);
		this._timer = null;
	},

	_cycle: function(/*boolean or int*/next){
		// summary:
		//		Cycles to the next/previous child.

		// if next is an int, then _cycle() was called via a timer
		// if next is a boolean, then _cycle() was called via the next/prev buttons, stop playing and reset cycles
		if(next instanceof Boolean || typeof next == "boolean"){
			this._manualChange();
		}

		var c = this.getChildren(),
			len = c.length,
			i = array.indexOf(c, this.selectedChildWidget) + (next === false || (next !== true && this.reverse) ? -1 : 1);
		this.selectChild(c[(i < len ? (i < 0 ? len-1 : i) : 0)]);
		this._updatePager();
	},

	_manualChange: function(){
		// summary:
		//		This function is only called when a manual change occurs in which
		//		case we may need to stop playing and we need to reset the cycle counter
		if(this.pauseOnManualChange){
			this._playing = false;
		}
		this.cycles = -1;
	},

	_play: function(skip){
		// summary:
		//		Schedules the next transition.
		this._playing = true;
		this._resetTimer();
		if(skip !== true && this.cycles>0){
			this.cycles--;
		}
		if(this.cycles==0){
			this._pause();
		}else if((!this.suspendOnHover || !this._over) && this.transitionDelay){
			// check if current pane has a delay
			this._timer = setTimeout(lang.hitch(this, "_cycle"), this.selectedChildWidget.domNode.getAttribute("transitionDelay") || this.transitionDelay);
		}
		this._updatePager();
	},

	_pause: function(){
		// summary:
		//		Clears the transition timer and pauses the rotator.
		this._playing = false;
		this._resetTimer();
	},

	_state: function(playing){
		// summary:
		//		Fired when the play/pause pager button is toggled.
		if(playing){
			// since we were manually changed, disable the cycle counter
			this.cycles = -1;
			this._play();
		}else{
			this._pause();
		}
	},

	_transition: function(/*dijit._Widget*/ next, /*dijit._Widget*/ prev){
		// summary:
		//		Dispatches the appropriate transition.
		this._resetTimer();

		// check if we have anything to transition
		if(prev && this.transitionDuration){
			switch(this.transition){
				case "fade": this._fade(next, prev); return;
			}
		}

		this._transitionEnd();
		this.inherited(arguments);
	},

	_transitionEnd: function(){
		if(this._playing){
			this._play();
		}else{
			this._updatePager();
		}
	},

	_fade: function(/*dijit._Widget*/ next, /*dijit._Widget*/ prev){
		// summary:
		//		Crossfades two children.
		this._styleNode(prev.domNode, 1, 1);
		this._styleNode(next.domNode, 0, 2);

		// show the next child and make sure it's sized properly
		this._showChild(next);
		if(this.doLayout && next.resize){
			next.resize(this._containerContentBox || this._contentBox);
		}

		// create the crossfade animation
		var args = { duration:this.transitionDuration },
			anim = coreFx.combine([
				baseFx["fadeOut"](lang.mixin({node:prev.domNode}, args)),
				baseFx["fadeIn"](lang.mixin({node:next.domNode}, args))
			]);

		this.connect(anim, "onEnd", lang.hitch(this,function(){
			this._hideChild(prev);
			this._transitionEnd();
		}));

		anim.play();
	},

	_styleNode: function(/*DomNode*/node, /*number*/opacity, /*int*/zIndex){
		// summary:
		//		Helper function to style the children.
		html.style(node, "opacity", opacity);
		html.style(node, "zIndex", zIndex);
		html.style(node, "position", "absolute");
	}
});

declare("dojox.layout.RotatorPager", [Widget, Templated, Contained], {
	// summary:
	//		Defines controls used to manipulate a RotatorContainer
	//
	// description:
	//		A pager can be defined one of two ways:
	//
	//		- Externally of the RotatorContainer's template and tell the
	//		RotatorPager the rotatorId of the RotatorContainer
	//		- As a direct descendant of the RotatorContainer (i.e. inside the
	//		RotatorContainer's template)
	//
	//		The pager can contain the following components:
	//
	//		- Previous button
	//			- Must be a dijit.form.Button
	//			- dojoAttachPoint must be named "previous"
	//		- Next button
	//			- Must be a dijit.form.Button
	//			- dojoAttachPoint must be named "next"
	//		- Play/Pause toggle button
	//			- Must be a dijit.form.ToggleButton
	//			- dojoAttachPoint must be named "playPause"
	//			- Use iconClass to specify toggled state
	//		- Current child #
	//			- dojoAttachPoint must be named "current"
	//		- Total # of children
	//			- dojoAttachPoint must be named "total"
	//
	//		You can choose to exclude specific controls as well as add elements
	//		for styling.
	//
	//		Should you need a pager, but don't want to use Dijit buttons, you can
	//		write your own pager widget and just wire it into the topics.  The
	//		topic names are prefixed with the widget ID of the RotatorContainer.
	//		Notifications are received from and sent to the RotatorContainer as
	//		well as other RotatorPagers.
	//
	//		####published topics:
	//
	//		[widgetId]-cycle - Notify that the next or previous button was pressed.
	//		Parameters:
	//
	//		- /*boolean*/ next - true if next, false if previous
	//
	//		[widgetId]-state - Notify that the play/pause button was toggled.
	//		Parameters:
	//
	//		- /*boolean*/ playing - true if playing, false if paused
	//
	// example:
	//		A pager with the current/total children and previous/next buttons.
	// |	<div dojoType="dojox.layout.RotatorPager" rotatorId="myRotator">
	// |		<button dojoType="dijit.form.Button" dojoAttachPoint="previous">Prev</button>
	// |		<span dojoAttachPoint="current"></span> / <span dojoAttachPoint="total"></span>
	// |		<button dojoType="dijit.form.Button" dojoAttachPoint="next">Next</button>
	// |	</div>
	//
	// example:
	//		A pager with only a play/pause toggle button.
	// |	<div dojoType="dojox.layout.RotatorPager" rotatorId="myRotator">
	// |		<button dojoType="dijit.form.ToggleButton" dojoAttachPoint="playPause"></button>
	// |	</div>
	//
	// example:
	//		A pager styled with iconClass.
	// |	<div dojoType="dojox.layout.RotatorPager" class="rotatorIcons" rotatorId="myRotator">
	// |		<button dojoType="dijit.form.Button" iconClass="previous" dojoAttachPoint="previous">Prev</button>
	// |		<button dojoType="dijit.form.ToggleButton" iconClass="playPause" dojoAttachPoint="playPause"></button>
	// |		<button dojoType="dijit.form.Button" iconClass="next" dojoAttachPoint="next">Next</button>
	// |		<span dojoAttachPoint="current"></span> / <span dojoAttachPoint="total"></span>
	// |	</div>

	widgetsInTemplate: true,

	// rotatorId: int
	//		The ID of the rotator this pager is tied to.
	//		Only required if defined outside of the RotatorContainer's container.
	rotatorId: "",

	postMixInProperties: function(){
		this.templateString = "<div>" + this.srcNodeRef.innerHTML + "</div>";
	},

	postCreate: function(){
		var p = manager.byId(this.rotatorId) || this.getParent();
		if(p && p.declaredClass == "dojox.layout.RotatorContainer"){
			if(this.previous){
				connect.connect(this.previous, "onClick", function(){
					connect.publish(p.id+"-cycle", [false]);
				});
			}
			if(this.next){
				connect.connect(this.next, "onClick", function(){
					connect.publish(p.id+"-cycle", [true]);
				});
			}
			if(this.playPause){
				connect.connect(this.playPause, "onClick", function(){
					this.set('label', this.checked ? "Pause" : "Play");
					connect.publish(p.id+"-state", [this.checked]);
				});
			}
			this._subscriptions = [
				connect.subscribe(p.id+"-state", this, "_state"),
				connect.subscribe(p.id+"-update", this, "_update")
			];
		}
	},

	destroy: function(){
		// Unsubscribe to all of our topics
		array.forEach(this._subscriptions, connect.unsubscribe);
		this.inherited(arguments);
	},

	_state: function(/*boolean*/playing){
		// summary:
		//		Updates the display of the play/pause button
		if(this.playPause && this.playPause.checked != playing){
			this.playPause.set("label", playing ? "Pause" : "Play");
			this.playPause.set("checked", playing);
		}
	},

	_update: function(/*boolean*/playing, /*int*/current, /*int*/total){
		// summary:
		//		Updates the pager's play/pause button, current child, and total number of children.
		this._state(playing);
		if(this.current && current){
			this.current.innerHTML = current;
		}
		if(this.total && total){
			this.total.innerHTML = total;
		}
	}
});
return RotatorContainer;
});
