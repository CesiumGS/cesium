define([
	"dojo/aspect",
	"dojo/_base/declare",
	"dojo/_base/Deferred",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/fx",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/topic",
	"dojo/on",
	"dojo/parser",
	"dojo/query",
	"dojo/fx/easing",
	"dojo/NodeList-dom"
], function(aspect, declare, Deferred, lang, array, fx, dom, domAttr, domConstruct, domGeometry, domStyle, topic,
			on, parser, query){

	// build friendly strings
	var _defaultTransition = "dojox.widget.rotator.swap", // please do NOT change
		_defaultTransitionDuration = 500,
		_displayStr = "display",
		_noneStr = "none",
		_zIndex = "zIndex";

	var Rotator = declare("dojox.widget.Rotator", null, {
		// summary:
		//		A widget for rotating through child nodes using transitions.
		//
		// description:
		//		A small, fast, extensible, awesome rotator that cycles, with transitions,
		//		through panes (child nodes) displaying only one at a time and ties into
		//		controllers used to change state.
		//
		//		The Rotator does not rely on dijit.  It is designed to be as lightweight
		//		as possible.  Controllers and transitions have been externalized
		//		so builds can be as optimized with only the components you want to use.
		//
		//		For best results, each rotator pane should be the same height and width as
		//		the Rotator container node and consider setting overflow to hidden.
		//		While the Rotator will accept any DOM node for a rotator pane, a block
		//		element or element with display:block is recommended.
		//
		//		Note: When the Rotator begins, it does not transition the first pane.
		//
		//		subscribed topics:
		//
		//			[id]/rotator/control - Controls the Rotator
		//			Parameters:
		//
		//			- /*string*/ action        - The name of a method of the Rotator to run
		//			- /*anything?*/ args       - One or more arguments to pass to the action
		//
		//		published topics:
		//
		//		[id]/rotator/update - Notifies controllers that a pane or state has changed.
		//		Parameters:
		//
		//		- /*string*/ type          - the type of notification
		//		- /*dojox.widget.Rotator*/ rotator - the rotator instance
		//		- /*object?*/ params		 - params
		//
		//		declarative dojo/method events (per pane):
		//
		//		- onBeforeIn  - Fired before the transition in starts.
		//		- onAfterIn   - Fired after the transition in ends.
		//		- onBeforeOut - Fired before the transition out starts.
		//		- onAfterOut  - Fired after the transition out ends.
		//
		// example:
		//	|	<div dojoType="dojox.widget.Rotator">
		//	|		<div>Pane 1!</div>
		//	|		<div>Pane 2!</div>
		//	|	</div>
		//
		// example:
		//	|	<script type="text/javascript">
		//	|		require("dojo/parser", "dojo/domReady!", "dojox/widget/Rotator", "dojox/widget/rotator/Fade"],
		//	|           function(parser) { parser.parse(); });
		//	|	</script>
		//	|	<div dojoType="dojox/widget/Rotator" transition="dojox/widget/rotator/crossFade">
		//	|		<div>Pane 1!</div>
		//	|		<div>Pane 2!</div>
		//	|	</div>

		// transition: string
		//		The name of a function that is passed two panes nodes and a duration,
		//		then returns a dojo.Animation object. The default value is
		//		"dojox.widget.rotator.swap".
		transition: _defaultTransition,

		// transitionParams: string
		//		Parameters for the transition. The string is read in and eval'd as an
		//		object.  If the duration is absent, the default value will be used.
		transitionParams: "duration:" + _defaultTransitionDuration,

		// panes: array
		//		Array of panes to be created in the Rotator. Each array element
		//		will be passed as attributes to a html.create() call.
		panes: null,

		constructor: function(/*Object*/params, /*DomNode|string*/node){
			// summary:
			//		Initializes the panes and events.
			lang.mixin(this, params);

			var _t = this,
				t = _t.transition,
				tt = _t._transitions = {},
				idm = _t._idMap = {},
				tp = _t.transitionParams = eval("({ " + _t.transitionParams + " })"),
				node = _t._domNode = dom.byId(node),
				cb = _t._domNodeContentBox = domGeometry.getContentBox(node), // we are going to assume the rotator will not be changing size

				// default styles to apply to all the container node and rotator's panes
				p = {
					left: 0,
					top: 0
				},

				warn = function(bt, dt){
					console.warn(_t.declaredClass, ' - Unable to find transition "', bt, '", defaulting to "', dt, '".');
				};

			// if we don't have an id, then generate one
			_t.id = node.id || (new Date()).getTime();

			// force the rotator DOM node to a relative position and attach the container node to it
			if(domStyle.get(node, "position") == "static"){
				domStyle.set(node, "position", "relative");
			}

			// create our object for caching transition objects
			tt[t] = lang.getObject(t);
			if(!tt[t]){
				warn(t, _defaultTransition);
				tt[_t.transition = _defaultTransition] = d.getObject(_defaultTransition);
			}

			// clean up the transition params
			if(!tp.duration){
				tp.duration = _defaultTransitionDuration;
			}

			// if there are any panes being passed in, add them to this node
			array.forEach(_t.panes, function(p){
				domConstruct.create("div", p, node);
			});

			// zero out our panes array to store the real pane instance
			var pp = _t.panes = [];

			// find and initialize the panes
			query(">", node).forEach(function(n, i){
				var q = { node: n, idx: i, params: lang.mixin({}, tp, eval("({ " + (domAttr.get(n, "transitionParams") || "") + " })")) },
					r = q.trans = domAttr.get(n, "transition") || _t.transition;

				// cache each pane's title, duration, and waitForEvent attributes
				array.forEach(["id", "title", "duration", "waitForEvent"], function(a){
					q[a] = domAttr.get(n, a);
				});

				if(q.id){
					idm[q.id] = i;
				}

				// cache the transition function
				if(!tt[r] && !(tt[r] = lang.getObject(r))){
					warn(r, q.trans = _t.transition);
				}

				p.position = "absolute";
				p.display = _noneStr;

				// find the selected pane and initialize styles
				if(_t.idx == null || domAttr.get(n, "selected")){
					if(_t.idx != null){
						domStyle.set(pp[_t.idx].node, _displayStr, _noneStr);
					}
					_t.idx = i;
					p.display = "";
				}
				domStyle.set(n, p);

				// check for any declarative script blocks
				query("> script[type^='dojo/method']", n).orphan().forEach(function(s){
					var e = domAttr.get(s, "event");
					if(e){
						q[e] = parser._functionFromScript(s);
					}
				});

				// add this pane to the array of panes
				pp.push(q);
			});

			_t._controlSub = topic.subscribe(_t.id + "/rotator/control", lang.hitch(_t, this.control));
		},

		destroy: function(){
			// summary:
			//		Destroys the Rotator and its DOM node.
			array.forEach([this._controlSub, this.wfe], function(wfe) { wfe.remove() });
			domConstruct.destroy(this._domNode);
		},

		next: function(){
			// summary:
			//		Transitions the Rotator to the next pane.
			return this.go(this.idx + 1);
		},

		prev: function(){
			// summary:
			//		Transitions the Rotator to the previous pane.
			return this.go(this.idx - 1);
		},

		go: function(/*int|string?*/p){
			// summary:
			//		Transitions the Rotator to the specified pane index.
			var _t = this,
				i = _t.idx,
				pp = _t.panes,
				len = pp.length,
				idm = _t._idMap[p];

			// we gotta move on, so if the current pane is waiting for an event, just
			// ignore it and clean up
			_t._resetWaitForEvent();

			// determine the next index and set it to idx for the next go to
			p = idm != null ? idm : (p || 0);
			p = p < len ? (p < 0 ? len-1 : p) : 0;

			// if we're already on the requested pane or still transitioning, then return
			if(p == i || _t.anim){
				return null;
			}

			// get the current and next panes
			var current = pp[i],
				next = pp[p];

			// adjust the zIndexes so our animations look good... this must be done before
			// the animation is created so the animation could override it if necessary
			domStyle.set(current.node, _zIndex, 2);
			domStyle.set(next.node, _zIndex, 1);

			// info object passed to animations and onIn/Out events
			var info = {
					current: current,
					next: next,
					rotator: _t
				},

				// get the transition
				anim = _t.anim = _t._transitions[next.trans](lang.mixin({
					rotatorBox: _t._domNodeContentBox
				}, info, next.params));

			if(anim){
				// create the deferred that we'll be returning
				var def = new Deferred(),
					ev = next.waitForEvent,

				h = aspect.after(anim, "onEnd", function(){
					// reset the node styles
					domStyle.set(current.node, {
						display: _noneStr,
						left: 0,
						opacity: 1,
						top: 0,
						zIndex: 0
					});

					h.remove();
					_t.anim = null;
					_t.idx = p;

					// fire end events
					if(current.onAfterOut){ current.onAfterOut(info); }
					if(next.onAfterIn){ next.onAfterIn(info); }

					_t.onUpdate("onAfterTransition");

					if(!ev){
						// if there is a previous waitForEvent, then we need to make
						// sure it gets unsubscribed
						_t._resetWaitForEvent();

						// animation is all done, fire the deferred callback.
						def.callback();
					}
				}, true);

				// if we're waiting for an event, subscribe to it so we know when to continue
				_t.wfe = ev ? topic.subscribe(ev, function(){
					_t._resetWaitForEvent();
					def.callback(true);
				}) : null;

				_t.onUpdate("onBeforeTransition");

				// fire start events
				if(current.onBeforeOut){ current.onBeforeOut(info); }
				if(next.onBeforeIn){ next.onBeforeIn(info); }

				// play the animation
				anim.play();

				// return the deferred
				return def; /*Deferred*/
			}
		},

		onUpdate: function(/*string*/type, /*object?*/params){
			// summary:
			//		Send a notification to all controllers with the state of the rotator.
			topic.publish(this.id + "/rotator/update", type, this, params || {});
		},

		_resetWaitForEvent: function(){
			// summary:
			//		If there is a waitForEvent pending, kill it.
			if(this.wfe){
				this.wfe.remove();
				delete this.wfe;
			}
		},

		control: function(/*string*/action){
			// summary:
			//		Dispatches an action, first to this engine, then to the Rotator.
			var args = lang._toArray(arguments),
				_t = this;
			args.shift();

			_t._resetWaitForEvent();

			if(_t[action]){
				// action exists, so call it and fire deferred if applicable
				var def = _t[action].apply(_t, args);
				if(def){
					def.addCallback(function(){
						_t.onUpdate(action);
					});
				}

				// since this action was triggered by a controller, we assume this was a
				// manual action, so check if we should pause
				_t.onManualChange(action);
			}else{
				console.warn(_t.declaredClass, ' - Unsupported action "', action, '".');
			}
		},

		resize: function(/*int*/width, /*int*/height){
			var b = this._domNodeContentBox = { w: width, h: height };
			domGeometry.setContentSize(this._domNode, b);
			array.forEach(this.panes, function(p){ domGeometry.setContentSize(p.node, b); });
		},

		onManualChange: function(){
			// summary:
			//		Stub function that can be overriden or connected to.
		}
	});

	lang.setObject(_defaultTransition, function(/*Object*/args){
		// summary:
		//		The default rotator transition which swaps two panes.
		return new fx.Animation({ // dojo.Animation
			play: function(){
				domStyle.set(args.current.node, _displayStr, _noneStr);
				domStyle.set(args.next.node, _displayStr, "");
				this._fire("onEnd");
			}
		});
	});

	return Rotator;
});