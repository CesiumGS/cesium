dojo.provide("dojox.widget.UpgradeBar");

dojo.require("dojo.window");
dojo.require("dojo.fx");
dojo.require("dojo.cookie");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");

dojo.experimental("dojox.widget.UpgradeBar");


dojo.declare("dojox.widget.UpgradeBar", [dijit._Widget, dijit._Templated], {
	//	summary:
	//				Shows a bar at the top of the screen when the user is to
	//				be notified that they should upgrade their browser or a
	//				plugin.
	//
	//	description:
	//				You can insert custom validations to trigger the UpgradeBar
	//				to display. An evaluation of 'true' shows the bar (as this
	//				version *is* less than it should be). Multiple validations
	//				may be checked, although only the first in the list will be
	//				displayed.
	//				Markup and programmatic are supported. Markup is a little
	//				cleaner, since a majority of the parameters are the HTML
	//				snippets to be displayed. In markup, the validate code should
	//				be an expression that will evaluate to true or false. This
	//				expression is wrapped in a try/catch, so if it blows up, it
	//				is assumed to be true and trigger the bar.
	//				In programmtic, a function should be used that returns true
	//				or false. You would need to use your own try/catch in that.
	//
	//	example:	See tests for examples.
	//
	//	notifications: Array
	//		An array of objects that hold the criteria for upgrades.
	//			message: String
	//				The message to display in the bar. Can be HTML.
	//			validate:Function
	//				The expression to evaluate to determine if the
	//				bar should show or not. Should be a simple expression
	//				if used in HTML:
	//				|	<div validate="!google.gears">
	//				|	<div validate="dojo.isIE<8">
	notifications:[],
	//
	//	buttonCancel:String
	//		The HTML tip show when hovering over the close button.
	buttonCancel:"Close for now",
	//
	//	noRemindButton:String
	//		The text link shown that when clicked, permanently dismisses
	//		the message (sets a cookie). If this string is blank, this
	//		link is not displayed.
	noRemindButton:"Don't Remind Me Again",

	templateString: dojo.cache("dojox.widget","UpgradeBar/UpgradeBar.html"),

	constructor: function(props, node){

		if(!props.notifications && node){
			// From markup. Create the notifications Array from the
			//	srcRefNode children.
			dojo.forEach(node.childNodes, function(n){
				if(n.nodeType==1){
					var val = dojo.attr(n, "validate");
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
		// 	summary:
		//			Internal. Go through the notifications Array
		//			and check for any that evaluate to true.
		// tags:
		//		private
		//
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
			dojo.style(this.domNode, "display", "none");
		}
		dojo.mixin(this.attributeMap, {
			message:{ node:"messageNode", type:"innerHTML" }
		});
		if(!this.noRemindButton){
			dojo.destroy(this.dontRemindButtonNode)
		}
		if(dojo.isIE==6){
			// IE6 is challenged when it comes to 100% width.
			// It thinks the body has more padding and more
			// margin than it really does. It would work to
			// set the body pad and margin to 0, but we can't
			// set that and disturb a potential layout.
			//
			var self = this;
			var setWidth = function(){
				var v = dojo.window.getBox();
				dojo.style(self.domNode, "width", v.w+"px");
			}
			this.connect(window, "resize", function(){
				setWidth();
			});

			setWidth();
		}
		dojo.addOnLoad(this, "checkNotifications");
		//this.checkNotifications();
	},

	notify: function(msg){
		// 	summary:
		//		Triggers the bar to display. An internal function,
		//		but could ne called externally for fun.
		// tags:
		//		protected
		//
		if(dojo.cookie("disableUpgradeReminders")){
			return;
		}
		if(!this.domNode.parentNode || !this.domNode.parentNode.innerHTML){
			document.body.appendChild(this.domNode);
		}
		dojo.style(this.domNode, "display", "");
		if(msg){
			this.set("message", msg);
		}

	},

	show: function(){
		//	summary:
		//		Internal. Shows the bar. Do not call directly.
		//		Use notify();
		// tags:
		//		private
		//
		this._bodyMarginTop = dojo.style(dojo.body(), "marginTop");
		this._size = dojo.contentBox(this.domNode).h;
		dojo.style(this.domNode, { display:"block", height:0, opacity:0 });

		if(!this._showAnim){
			this._showAnim = dojo.fx.combine([
				dojo.animateProperty({ node:dojo.body(), duration:500, properties:{ marginTop:this._bodyMarginTop+this._size } }),
				dojo.animateProperty({ node:this.domNode, duration:500, properties:{ height:this._size, opacity:1 } })
			]);
		}
		this._showAnim.play();
	},

	hide: function(){
		//	summary:
		//		Hides the bar. May be called externally.
		//
		if(!this._hideAnim){
			this._hideAnim = dojo.fx.combine([
				dojo.animateProperty({ node:dojo.body(), duration:500, properties:{ marginTop:this._bodyMarginTop } }),
				dojo.animateProperty({ node:this.domNode, duration:500, properties:{ height:0, opacity:0 } })
			]);
			dojo.connect(this._hideAnim, "onEnd", this, function(){
				dojo.style(this.domNode, "display", "none");
			});
		}
		this._hideAnim.play();
	},

	_onDontRemindClick: function(){
		// summary:
		//		Called when user clicks the "do not remind" link.
		// tags:
		//		private
		dojo.cookie("disableUpgradeReminders", true, { expires:3650 });
		this.hide();
	},

	_onCloseEnter: function(){
		// summary:
		//		Called when user hovers over close icon
		// tags:
		//		private
		dojo.addClass(this.closeButtonNode, "dojoxUpgradeBarCloseIcon-hover");
	},

	_onCloseLeave: function(){
		// summary:
		//		Called when user stops hovering over close icon
		// tags:
		//		private
		dojo.removeClass(this.closeButtonNode, "dojoxUpgradeBarCloseIcon-hover");
	}

});
