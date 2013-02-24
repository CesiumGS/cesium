define([
	"dojo/_base/kernel", // dojo.eval
	"dojo/_base/array", // array.forEach
	"dojo/_base/connect", // connect
	"dojo/_base/declare", // declare
	"dojo/_base/fx", // baseFx.animateProperty
	"dojo/_base/lang", // lang.mixin, lang.hitch
	"dojo/_base/sniff", // has("ie")
	"dojo/_base/window", // baseWin.body
	"dojo/dom-attr", // domAttr.get
	"dojo/dom-class", // domClass.addClass, domClass.removeClass
	"dojo/dom-construct", // domConstruct.destroy
	"dojo/dom-geometry", // domGeo.getContentBox
	"dojo/dom-style", // style.get, style.set
	"dojo/cache", // cache
	"dojo/cookie", // cookie
	"dojo/domReady", // domReady
	"dojo/fx", // fx.combine
	"dojo/window", // win.getBox
	"dijit/_WidgetBase", // _WidgetBase
	"dijit/_TemplatedMixin" // _TemplatedMixin
], function(dojo, array, connect, declare, baseFx, lang, has, baseWin,
            domAttr, domClass, domConstruct, domGeo, style, cache, cookie,
            domReady, fx, win, _WidgetBase, _TemplatedMixin){

dojo.experimental("dojox.widget.UpgradeBar");

var UpgradeBar = declare("dojox.widget.UpgradeBar", [_WidgetBase, _TemplatedMixin], {
	// summary:
	//		Shows a bar at the top of the screen when the user is to
	//		be notified that they should upgrade their browser or a
	//		plugin.
	// description:
	//		You can insert custom validations to trigger the UpgradeBar
	//		to display. An evaluation of 'true' shows the bar (as this
	//		version *is* less than it should be). Multiple validations
	//		may be checked, although only the first in the list will be
	//		displayed.
	//		Markup and programmatic are supported. Markup is a little
	//		cleaner, since a majority of the parameters are the HTML
	//		snippets to be displayed. In markup, the validate code should
	//		be an expression that will evaluate to true or false. This
	//		expression is wrapped in a try/catch, so if it blows up, it
	//		is assumed to be true and trigger the bar.
	//		In programmatic, a function should be used that returns true
	//		or false. You would need to use your own try/catch in that.
	// example:
	//		See tests for examples.


	// notifications: Array
	//		An array of objects that hold the criteria for upgrades:
	//
	//		- message: String: The message to display in the bar. Can be HTML.
	//		- validate: Function: The expression to evaluate to determine if the
	//			bar should show or not. Should be a simple expression
	//			if used in HTML:
	//
	//	|	<div validate="!google.gears">
	//	|	<div validate="has('ie')<8">
	notifications:[],

	// buttonCancel:String
	//		The HTML tip show when hovering over the close button.
	buttonCancel:"Close for now",

	// noRemindButton:String
	//		The text link shown that when clicked, permanently dismisses
	//		the message (sets a cookie). If this string is blank, this
	//		link is not displayed.
	noRemindButton:"Don't Remind Me Again",

	templateString: cache("dojox.widget","UpgradeBar/UpgradeBar.html"),

	constructor: function(props, node){

		if(!props.notifications && node){
			// From markup. Create the notifications Array from the
			// srcRefNode children.
			array.forEach(node.childNodes, function(n){
				if(n.nodeType==1){
					var val = domAttr.get(n, "validate");
					this.notifications.push({
						message:n.innerHTML,
						validate:function(){
							// the function that fires to determine if the
							// bar shows or not.
							var evals = true;
							try{
								evals = dojo.eval(val);
							}catch(e){ /* squelch. it's true.*/ }
							return evals;
						}
					});
				}
			}, this);
		}

	},

	checkNotifications: function(){
		// summary:
		//		Internal. Go through the notifications Array
		//		and check for any that evaluate to true.
		// tags:
		//		private

		if(!this.notifications.length){
			// odd. why use the bar but not set any notifications?
			return;
		}

		for(var i=0;i<this.notifications.length;i++){
			var evals = this.notifications[i].validate();
			if(evals){
				this.notify(this.notifications[i].message);
				// Validation resulted in true, meaning a feature is missing
				// Don't check any other messages. One at a time.
				break;
			}
		}
	},

	postCreate: function(){
		this.inherited(arguments);
		if(this.domNode.parentNode){
			style.set(this.domNode, "display", "none");
		}
		lang.mixin(this.attributeMap, {
			message:{ node:"messageNode", type:"innerHTML" }
		});
		if(!this.noRemindButton){
			domConstruct.destroy(this.dontRemindButtonNode);
		}
		if(has("ie")==6){
			// IE6 is challenged when it comes to 100% width.
			// It thinks the body has more padding and more
			// margin than it really does. It would work to
			// set the body pad and margin to 0, but we can't
			// set that and disturb a potential layout.
			//
			var self = this;
			var setWidth = function(){
				var v = win.getBox();
				style.set(self.domNode, "width", v.w+"px");
			};
			this.connect(window, "resize", function(){
				setWidth();
			});

			setWidth();
		}
		domReady(lang.hitch(this, "checkNotifications"));
		//this.checkNotifications();
	},

	notify: function(msg){
		// summary:
		//		Triggers the bar to display. An internal function,
		//		but could be called externally for fun.
		// tags:
		//		protected

		if(cookie("disableUpgradeReminders")){
			return;
		}
		if(!this.domNode.parentNode || !this.domNode.parentNode.innerHTML){
			document.body.appendChild(this.domNode);
		}
		style.set(this.domNode, "display", "");
		if(msg){
			this.set("message", msg);
		}

	},

	show: function(){
		// summary:
		//		Internal. Shows the bar. Do not call directly.
		//		Use notify();
		// tags:
		//		private

		this._bodyMarginTop = style.get(baseWin.body(), "marginTop");
		this._size = domGeo.getContentBox(this.domNode).h;
		style.set(this.domNode, { display:"block", height:0, opacity:0 });

		if(!this._showAnim){
			this._showAnim = fx.combine([
				baseFx.animateProperty({ node:baseWin.body(), duration:500, properties:{ marginTop:this._bodyMarginTop+this._size } }),
				baseFx.animateProperty({ node:this.domNode, duration:500, properties:{ height:this._size, opacity:1 } })
			]);
		}
		this._showAnim.play();
	},

	hide: function(){
		// summary:
		//		Hides the bar. May be called externally.

		if(!this._hideAnim){
			this._hideAnim = fx.combine([
				baseFx.animateProperty({ node:baseWin.body(), duration:500, properties:{ marginTop:this._bodyMarginTop } }),
				baseFx.animateProperty({ node:this.domNode, duration:500, properties:{ height:0, opacity:0 } })
			]);
			connect.connect(this._hideAnim, "onEnd", this, function(){
				style.set(this.domNode, {display:"none", opacity:1});
			});
		}
		this._hideAnim.play();
	},

	_onDontRemindClick: function(){
		// summary:
		//		Called when user clicks the "do not remind" link.
		// tags:
		//		private
		cookie("disableUpgradeReminders", true, { expires:3650 });
		this.hide();
	},

	_onCloseEnter: function(){
		// summary:
		//		Called when user hovers over close icon
		// tags:
		//		private
		domClass.add(this.closeButtonNode, "dojoxUpgradeBarCloseIcon-hover");
	},

	_onCloseLeave: function(){
		// summary:
		//		Called when user stops hovering over close icon
		// tags:
		//		private
		domClass.remove(this.closeButtonNode, "dojoxUpgradeBarCloseIcon-hover");
	}
});


return UpgradeBar;
});
