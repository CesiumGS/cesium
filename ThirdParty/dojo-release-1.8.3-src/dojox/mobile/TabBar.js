define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./TabBarButton" // to load TabBarButton for you (no direct references)
], function(array, declare, win, domClass, domConstruct, domGeometry, domStyle, Contained, Container, WidgetBase, TabBarButton){

	// module:
	//		dojox/mobile/TabBar

	return declare("dojox.mobile.TabBar", [WidgetBase, Container, Contained],{
		// summary:
		//		A bar widget that has buttons to control visibility of views.
		// description:
		//		TabBar is a container widget that has typically multiple
		//		TabBarButtons which controls visibility of views. It can be used
		//		as a tab container.

		// iconBase: String
		//		The default icon path for child items.
		iconBase: "",

		// iconPos: String
		//		The default icon position for child items.
		iconPos: "",

		// barType: String
		//		"tabBar", "segmentedControl", "standardTab", "slimTab", "flatTab",
		//		or "tallTab"
		barType: "tabBar",

		// closable: Boolean
		//		If true, user can close (destroy) a child tab by clicking the X on the tab.
		//		This property is NOT effective for "tabBar" and "tallBar".
		closable: false,

		// center: Boolean
		//		If true, place the tabs in the center of the bar.
		//		This property is NOT effective for "tabBar".
		center: true,

		// syncWithViews: Boolean
		//		If true, this widget listens to view transition events to be
		//		synchronized with view's visibility.
		syncWithViews: false,

		// tag: String
		//		A name of html tag to create as domNode.
		tag: "ul",

		/* internal properties */
		// selectOne: [private] Boolean
		//		Specifies that only one item can be selected.
		selectOne: true,
		baseClass: "mblTabBar",
		_fixedButtonWidth: 76,
		_fixedButtonMargin: 17,
		_largeScreenWidth: 500,

		buildRendering: function(){
			this.domNode = this.srcNodeRef || domConstruct.create(this.tag);
			this.reset();
			this.inherited(arguments);
		},

		postCreate: function(){
			if(this.syncWithViews){ // see also RoundRect#postCreate
				var f = function(view, moveTo, dir, transition, context, method){
					var child = array.filter(this.getChildren(), function(w){
						return w.moveTo === "#" + view.id || w.moveTo === view.id; })[0];
					if(child){ child.set("selected", true); }
				};
				this.subscribe("/dojox/mobile/afterTransitionIn", f);
				this.subscribe("/dojox/mobile/startView", f);
			}
		},

		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			this.resize();
		},

		reset: function(){
			// summary:
			//		Resets the widget to its initial state.
			var prev = this._barType;
			if(typeof this.barType === "object"){
				this._barType = this.barType["*"];
				for(var c in this.barType){
					if(domClass.contains(win.doc.documentElement, c)){
						this._barType = this.barType[c];
						break;
					}
				}
			}else{
				this._barType = this.barType;
			}
			var cap = function(s){
				return s.charAt(0).toUpperCase() + s.substring(1);
			};
			if(prev){
				domClass.remove(this.domNode, this.baseClass + cap(prev));
			}
			domClass.add(this.domNode, this.baseClass + cap(this._barType));
		},

		resize: function(size){
			var i, w;
			if(size && size.w){
				domGeometry.setMarginBox(this.domNode, size);
				w = size.w;
			}else{
				// Calculation of the bar width varies according to its "position" value.
				// When the widget is used as a fixed bar, its position would be "absolute".
				w = domStyle.get(this.domNode, "position") === "absolute" ?
					domGeometry.getContentBox(this.domNode).w : domGeometry.getMarginBox(this.domNode).w;
			}
			var bw = this._fixedButtonWidth;
			var bm = this._fixedButtonMargin;
			var arr = array.map(this.getChildren(), function(w){ return w.domNode; });

			domClass.toggle(this.domNode, "mblTabBarNoIcons",
							!array.some(this.getChildren(), function(w){ return w.iconNode1; }));
			domClass.toggle(this.domNode, "mblTabBarNoText",
							!array.some(this.getChildren(), function(w){ return w.label; }));

			var margin = 0;
			if (this._barType == "tabBar"){
				this.containerNode.style.paddingLeft = "";
				margin = Math.floor((w - (bw + bm * 2) * arr.length) / 2);
				if(w < this._largeScreenWidth || margin < 0){
					// If # of buttons is 4, for example, assign "25%" to each button.
					// More precisely, 1%(left margin) + 98%(bar width) + 1%(right margin)
					for(i = 0; i < arr.length; i++){
						arr[i].style.width = Math.round(98/arr.length) + "%";
						arr[i].style.margin = "0";
					}
				}else{
					// Fixed width buttons. Mainly for larger screen such as iPad.
					for(i = 0; i < arr.length; i++){
						arr[i].style.width = bw + "px";
						arr[i].style.margin = "0 " + bm + "px";
					}
					if(arr.length > 0){
						arr[0].style.marginLeft = margin + bm + "px";
					}
					this.containerNode.style.padding = "0px";
				}
			}else{
				for(i = 0; i < arr.length; i++){
					arr[i].style.width = arr[i].style.margin = "";
				}
				var parent = this.getParent();
				if(this.center && (!parent || !domClass.contains(parent.domNode, "mblHeading"))){
					margin = w;
					for(i = 0; i < arr.length; i++){
						margin -= domGeometry.getMarginBox(arr[i]).w;
					}
					margin = Math.floor(margin/2);
				}
				this.containerNode.style.paddingLeft = margin ? margin + "px" : "";
			}
		},

		getSelectedTab: function(){
			// summary:
			//		Returns the first selected child.
			return array.filter(this.getChildren(), function(w){ return w.selected; })[0];
		},

		onCloseButtonClick: function(/*TabBarButton*/tab){
			// summary:
			//		Called whenever the close button [X] of a child tab is clicked.
			return true;
		}
	});
});
