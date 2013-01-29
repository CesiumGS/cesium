define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.setSelectable
	"dojo/dom-attr", // domAttr.set or get domAttr.remove
	"dojo/dom-class", // domClass.replace
	"dojo/dom-geometry", // domGeometry.setMarginBox domGeometry.getMarginBox
	"dojo/_base/event", // event.stop
	"dojo/fx", // fxUtils.wipeIn fxUtils.wipeOut
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys", // keys.DOWN_ARROW keys.ENTER
	"./_CssStateMixin",
	"./_TemplatedMixin",
	"./layout/ContentPane",
	"dojo/text!./templates/TitlePane.html",
	"./_base/manager"	// defaultDuration
], function(array, declare, dom, domAttr, domClass, domGeometry, event, fxUtils, kernel, keys,
			_CssStateMixin, _TemplatedMixin, ContentPane, template, manager){

// module:
//		dijit/TitlePane


return declare("dijit.TitlePane", [ContentPane, _TemplatedMixin, _CssStateMixin], {
	// summary:
	//		A pane with a title on top, that can be expanded or collapsed.
	//
	// description:
	//		An accessible container with a title Heading, and a content
	//		section that slides open and closed. TitlePane is an extension to
	//		`dijit/layout/ContentPane`, providing all the useful content-control aspects from it.
	//
	// example:
	//	|	// load a TitlePane from remote file:
	//	|	var foo = new dijit.TitlePane({ href: "foobar.html", title:"Title" });
	//	|	foo.startup();
	//
	// example:
	//	|	<!-- markup href example: -->
	//	|	<div data-dojo-type="dijit/TitlePane" data-dojo-props="href: 'foobar.html', title: 'Title'"></div>
	//
	// example:
	//	|	<!-- markup with inline data -->
	//	|	<div data-dojo-type="dijit/TitlePane" title="Title">
	//	|		<p>I am content</p>
	//	|	</div>

	// title: String
	//		Title of the pane
	title: "",
	_setTitleAttr: { node: "titleNode", type: "innerHTML" },	// override default where title becomes a hover tooltip

	// open: Boolean
	//		Whether pane is opened or closed.
	open: true,

	// toggleable: Boolean
	//		Whether pane can be opened or closed by clicking the title bar.
	toggleable: true,

	// tabIndex: String
	//		Tabindex setting for the title (so users can tab to the title then
	//		use space/enter to open/close the title pane)
	tabIndex: "0",

	// duration: Integer
	//		Time in milliseconds to fade in/fade out
	duration: manager.defaultDuration,

	// baseClass: [protected] String
	//		The root className to be placed on this widget's domNode.
	baseClass: "dijitTitlePane",

	templateString: template,

	// doLayout: [protected] Boolean
	//		Don't change this parameter from the default value.
	//		This ContentPane parameter doesn't make sense for TitlePane, since TitlePane
	//		is never a child of a layout container, nor should TitlePane try to control
	//		the size of an inner widget.
	doLayout: false,

	// Tooltip is defined in _WidgetBase but we need to handle the mapping to DOM here
	_setTooltipAttr: {node: "focusNode", type: "attribute", attribute: "title"},	// focusNode spans the entire width, titleNode doesn't

	buildRendering: function(){
		this.inherited(arguments);
		dom.setSelectable(this.titleNode, false);
	},

	postCreate: function(){
		this.inherited(arguments);

		// Hover and focus effect on title bar, except for non-toggleable TitlePanes
		// This should really be controlled from _setToggleableAttr() but _CssStateMixin
		// doesn't provide a way to disconnect a previous _trackMouseState() call
		if(this.toggleable){
			this._trackMouseState(this.titleBarNode, "dijitTitlePaneTitle");
		}

		// setup open/close animations
		var hideNode = this.hideNode, wipeNode = this.wipeNode;
		this._wipeIn = fxUtils.wipeIn({
			node: wipeNode,
			duration: this.duration,
			beforeBegin: function(){
				hideNode.style.display="";
			}
		});
		this._wipeOut = fxUtils.wipeOut({
			node: wipeNode,
			duration: this.duration,
			onEnd: function(){
				hideNode.style.display="none";
			}
		});
	},

	_setOpenAttr: function(/*Boolean*/ open, /*Boolean*/ animate){
		// summary:
		//		Hook to make set("open", boolean) control the open/closed state of the pane.
		// open: Boolean
		//		True if you want to open the pane, false if you want to close it.

		array.forEach([this._wipeIn, this._wipeOut], function(animation){
			if(animation && animation.status() == "playing"){
				animation.stop();
			}
		});

		if(animate){
			var anim = this[open ? "_wipeIn" : "_wipeOut"];
			anim.play();
		}else{
			this.hideNode.style.display = this.wipeNode.style.display = open ? "" : "none";
		}

		// load content (if this is the first time we are opening the TitlePane
		// and content is specified as an href, or href was set when hidden)
		if(this._started){
			if(open){
				this._onShow();
			}else{
				this.onHide();
			}
		}

		this.containerNode.setAttribute("aria-hidden", open ? "false" : "true");
		this.focusNode.setAttribute("aria-pressed", open ? "true" : "false");

		this._set("open", open);

		this._setCss();
	},

	_setToggleableAttr: function(/*Boolean*/ canToggle){
		// summary:
		//		Hook to make set("toggleable", boolean) work.
		// canToggle: Boolean
		//		True to allow user to open/close pane by clicking title bar.

		this.focusNode.setAttribute("role", canToggle ? "button" : "heading");
		if(canToggle){
			this.focusNode.setAttribute("aria-controls", this.id+"_pane");
			this.focusNode.setAttribute("tabIndex", this.tabIndex);
			this.focusNode.setAttribute("aria-pressed", this.open);
		}else{
			domAttr.remove(this.focusNode, "aria-controls");
			domAttr.remove(this.focusNode, "tabIndex");
			domAttr.remove(this.focusNode, "aria-pressed");
		}

		this._set("toggleable", canToggle);

		this._setCss();
	},

	_setContentAttr: function(/*String|DomNode|Nodelist*/ content){
		// summary:
		//		Hook to make set("content", ...) work.
		//		Typically called when an href is loaded.  Our job is to make the animation smooth.

		if(!this.open || !this._wipeOut || this._wipeOut.status() == "playing"){
			// we are currently *closing* the pane (or the pane is closed), so just let that continue
			this.inherited(arguments);
		}else{
			if(this._wipeIn && this._wipeIn.status() == "playing"){
				this._wipeIn.stop();
			}

			// freeze container at current height so that adding new content doesn't make it jump
			domGeometry.setMarginBox(this.wipeNode, { h: domGeometry.getMarginBox(this.wipeNode).h });

			// add the new content (erasing the old content, if any)
			this.inherited(arguments);

			// call _wipeIn.play() to animate from current height to new height
			if(this._wipeIn){
				this._wipeIn.play();
			}else{
				this.hideNode.style.display = "";
			}
		}
	},

	toggle: function(){
		// summary:
		//		Switches between opened and closed state
		// tags:
		//		private

		this._setOpenAttr(!this.open, true);
	},

	_setCss: function(){
		// summary:
		//		Set the open/close css state for the TitlePane
		// tags:
		//		private

		var node = this.titleBarNode || this.focusNode;
		var oldCls = this._titleBarClass;
		this._titleBarClass = "dijit" + (this.toggleable ? "" : "Fixed") + (this.open ? "Open" : "Closed");
		domClass.replace(node, this._titleBarClass, oldCls || "");

		this.arrowNodeInner.innerHTML = this.open ? "-" : "+";
	},

	_onTitleKey: function(/*Event*/ e){
		// summary:
		//		Handler for when user hits a key
		// tags:
		//		private

		if(e.keyCode == keys.ENTER || e.keyCode == keys.SPACE){
			if(this.toggleable){
				this.toggle();
				event.stop(e);
			}
		}else if(e.keyCode == keys.DOWN_ARROW && this.open){
			this.containerNode.focus();
			e.preventDefault();
		}
	},

	_onTitleClick: function(){
		// summary:
		//		Handler when user clicks the title bar
		// tags:
		//		private
		if(this.toggleable){
			this.toggle();
		}
	},

	setTitle: function(/*String*/ title){
		// summary:
		//		Deprecated.  Use set('title', ...) instead.
		// tags:
		//		deprecated
		kernel.deprecated("dijit.TitlePane.setTitle() is deprecated.  Use set('title', ...) instead.", "", "2.0");
		this.set("title", title);
	}
});

});
