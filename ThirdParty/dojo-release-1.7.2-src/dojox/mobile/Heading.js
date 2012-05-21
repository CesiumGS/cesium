define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/registry",	// registry.byId
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./View"
], function(array, connect, declare, lang, win, domClass, domConstruct, domStyle, registry, Contained, Container, WidgetBase, View){

	var dm = lang.getObject("dojox.mobile", true);

/*=====
	var Contained = dijit._Contained;
	var Container = dijit._Container;
	var WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/Heading
	// summary:
	//		A widget that represents a navigation bar.

	return declare("dojox.mobile.Heading", [WidgetBase, Container, Contained],{
		// summary:
		//		A widget that represents a navigation bar.
		// description:
		//		Heading is a widget that represents a navigation bar, which
		//		usually appears at the top of an application. It usually
		//		displays the title of the current view and can contain a
		//		navigational control. If you use it with
		//		dojox.mobile.ScrollableView, it can also be used as a fixed
		//		header bar or a fixed footer bar. In such cases, specify the
		//		fixed="top" attribute to be a fixed header bar or the
		//		fixed="bottom" attribute to be a fixed footer bar. Heading can
		//		have one or more ToolBarButton widgets as its children.

		// back: String
		//		A label for the navigational control to return to the previous
		//		View.
		back: "",

		// href: String
		//		A URL to open when the navigational control is pressed.
		href: "",

		// moveTo: String
		//		The id of the transition destination view which resides in the
		//		current page.
		//
		//		If the value has a hash sign ('#') before the id (e.g. #view1)
		//		and the dojo.hash module is loaded by the user application, the
		//		view transition updates the hash in the browser URL so that the
		//		user can bookmark the destination view. In this case, the user
		//		can also use the browser's back/forward button to navigate
		//		through the views in the browser history.
		//
		//		If null, transitions to a blank view.
		//		If '#', returns immediately without transition.
		moveTo: "",

		// transition: String
		//		A type of animated transition effect. You can choose from the
		//		standard transition types, "slide", "fade", "flip", or from the
		//		extended transition types, "cover", "coverv", "dissolve",
		//		"reveal", "revealv", "scaleIn", "scaleOut", "slidev",
		//		"swirl", "zoomIn", "zoomOut". If "none" is specified, transition
		//		occurs immediately without animation.
		transition: "slide",

		// label: String
		//		A title text of the heading. If the label is not specified, the
		//		innerHTML of the node is used as a label.
		label: "",

		// iconBase: String
		//		The default icon path for child items.
		iconBase: "",

		// backProp: Object
		//		Properties for the back button.
		backProp: {className: "mblArrowButton"},

		// tag: String
		//		A name of html tag to create as domNode.
		tag: "H1",

		buildRendering: function(){
			this.domNode = this.containerNode = this.srcNodeRef || win.doc.createElement(this.tag);
			this.domNode.className = "mblHeading";
			if(!this.label){
				array.forEach(this.domNode.childNodes, function(n){
					if(n.nodeType == 3){
						var v = lang.trim(n.nodeValue);
						if(v){
							this.label = v;
							this.labelNode = domConstruct.create("SPAN", {innerHTML:v}, n, "replace");
						}
					}
				}, this);
			}
			if(!this.labelNode){
				this.labelNode = domConstruct.create("SPAN", null, this.domNode);
			}
			this.labelNode.className = "mblHeadingSpanTitle";
			this.labelDivNode = domConstruct.create("DIV", {
				className: "mblHeadingDivTitle",
				innerHTML: this.labelNode.innerHTML
			}, this.domNode);
		},

		startup: function(){
			if(this._started){ return; }
			var parent = this.getParent && this.getParent();
			if(!parent || !parent.resize){ // top level widget
				var _this = this;
				setTimeout(function(){ // necessary to render correctly
					_this.resize();
				}, 0);
			}
			this.inherited(arguments);
		},
	
		resize: function(){
			if(this._btn){
				this._btn.style.width = this._body.offsetWidth + this._head.offsetWidth + "px";
			}
			if(this.labelNode){
				// find the rightmost left button (B), and leftmost right button (C)
				// +-----------------------------+
				// | |A| |B|             |C| |D| |
				// +-----------------------------+
				var leftBtn, rightBtn;
				var children = this.containerNode.childNodes;
				for(var i = children.length - 1; i >= 0; i--){
					var c = children[i];
					if(c.nodeType === 1){
						if(!rightBtn && domClass.contains(c, "mblToolBarButton") && domStyle.get(c, "float") === "right"){
							rightBtn = c;
						}
						if(!leftBtn && (domClass.contains(c, "mblToolBarButton") && domStyle.get(c, "float") === "left" || c === this._btn)){
							leftBtn = c;
						}
					}
				}

				if(!this.labelNodeLen && this.label){
					this.labelNode.style.display = "inline";
					this.labelNodeLen = this.labelNode.offsetWidth;
					this.labelNode.style.display = "";
				}

				var bw = this.domNode.offsetWidth; // bar width
				var rw = rightBtn ? bw - rightBtn.offsetLeft + 5 : 0; // rightBtn width
				var lw = leftBtn ? leftBtn.offsetLeft + leftBtn.offsetWidth + 5 : 0; // leftBtn width
				var tw = this.labelNodeLen || 0; // title width
				domClass[bw - Math.max(rw,lw)*2 > tw ? "add" : "remove"](this.domNode, "mblHeadingCenterTitle");
			}
			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		},

		_setBackAttr: function(/*String*/back){
			if (!back){
				domConstruct.destroy(this._btn);
				this._btn = null;
				this.back = "";
			}else{
				if(!this._btn){
					var btn = domConstruct.create("DIV", this.backProp, this.domNode, "first");
					var head = domConstruct.create("DIV", {className:"mblArrowButtonHead"}, btn);
					var body = domConstruct.create("DIV", {className:"mblArrowButtonBody mblArrowButtonText"}, btn);

					this._body = body;
					this._head = head;
					this._btn = btn;
					this.backBtnNode = btn;
					this.connect(body, "onclick", "onClick");
				}
				this.back = back;
				this._body.innerHTML = this._cv ? this._cv(this.back) : this.back;
			}
			this.resize();
		},
	
		_setLabelAttr: function(/*String*/label){
			this.label = label;
			this.labelNode.innerHTML = this.labelDivNode.innerHTML = this._cv ? this._cv(label) : label;
		},
	
		findCurrentView: function(){
			// summary:
			//		Search for the view widget that contains this widget.
			var w = this;
			while(true){
				w = w.getParent();
				if(!w){ return null; }
				if(w instanceof View){ break; }
			}
			return w;
		},

		onClick: function(e){
			var h1 = this.domNode;
			domClass.add(h1, "mblArrowButtonSelected");
			setTimeout(function(){
				domClass.remove(h1, "mblArrowButtonSelected");
			}, 1000);

			if(this.back && !this.moveTo && !this.href && history){
				history.back();	
				return;
			}	
	
			// keep the clicked position for transition animations
			var view = this.findCurrentView();
			if(view){
				view.clickedPosX = e.clientX;
				view.clickedPosY = e.clientY;
			}
			this.goTo(this.moveTo, this.href);
		},
	
		goTo: function(moveTo, href){
			// summary:
			//		Given the destination, makes a view transition.
			var view = this.findCurrentView();
			if(!view){ return; }
			if(href){
				view.performTransition(null, -1, this.transition, this, function(){location.href = href;});
			}else{
				if(dm.app && dm.app.STAGE_CONTROLLER_ACTIVE){
					// If in a full mobile app, then use its mechanisms to move back a scene
					connect.publish("/dojox/mobile/app/goback");
				}else{
					// Basically transition should be performed between two
					// siblings that share the same parent.
					// However, when views are nested and transition occurs from
					// an inner view, search for an ancestor view that is a sibling
					// of the target view, and use it as a source view.
					var node = registry.byId(view.convertToId(moveTo));
					if(node){
						var parent = node.getParent();
						while(view){
							var myParent = view.getParent();
							if(parent === myParent){
								break;
							}
							view = myParent;
						}
					}
					if(view){
						view.performTransition(moveTo, -1, this.transition);
					}
				}
			}
		}
	});
});
