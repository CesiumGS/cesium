define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./Heading",
	"./TabBarButton"
], function(array, declare, domClass, domConstruct, domGeometry, domStyle, Contained, Container, WidgetBase, Heading, TabBarButton){

/*=====
	var Contained = dijit._Contained;
	var Container = dijit._Container;
	var WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/TabBar
	// summary:
	//		A bar widget that has buttons to control visibility of views.

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
		//		"tabBar"(default) or "segmentedControl".
		barType: "tabBar",

		// inHeading: Boolean
		//		A flag that indicates whether this widget is in a Heading
		//		widget.
		inHeading: false,

		// tag: String
		//		A name of html tag to create as domNode.
		tag: "UL",

		/* internal properties */	
		_fixedButtonWidth: 76,
		_fixedButtonMargin: 17,
		_largeScreenWidth: 500,

		buildRendering: function(){
			this._clsName = this.barType == "segmentedControl" ? "mblTabButton" : "mblTabBarButton";
			this.domNode = this.containerNode = this.srcNodeRef || domConstruct.create(this.tag);
			this.domNode.className = this.barType == "segmentedControl" ? "mblTabPanelHeader" : "mblTabBar";
		},

		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			this.resize();
		},

		resize: function(size){
			var i,w;
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
	
			var children = this.containerNode.childNodes;
			var arr = [];
			for(i = 0; i < children.length; i++){
				var c = children[i];
				if(c.nodeType != 1){ continue; }
				if(domClass.contains(c, this._clsName)){
					arr.push(c);
				}
			}
	
			var margin;
			if(this.barType == "segmentedControl"){
				margin = w;
				var totalW = 0; // total width of all the buttons
				for(i = 0; i < arr.length; i++){
					margin -= domGeometry.getMarginBox(arr[i]).w;
					totalW += arr[i].offsetWidth;
				}
				margin = Math.floor(margin/2);
				var parent = this.getParent();
				var inHeading = this.inHeading || parent instanceof Heading;
				this.containerNode.style.padding = (inHeading ? 0 : 3) + "px 0px 0px " + (inHeading ? 0 : margin) + "px";
				if(inHeading){
					domStyle.set(this.domNode, {
						background: "none",
						border: "none",
						width: totalW + 2 + "px"
					});
				}
				domClass.add(this.domNode, "mblTabBar" + (inHeading ? "Head" : "Top"));
			}else{
				margin = Math.floor((w - (bw + bm * 2) * arr.length) / 2);
				if(w < this._largeScreenWidth || margin < 0){
					// If # of buttons is 4, for example, assign "25%" to each button.
					// More precisely, 1%(left margin) + 98%(bar width) + 1%(right margin)
					for(i = 0; i < arr.length; i++){
						arr[i].style.width = Math.round(98/arr.length) + "%";
						arr[i].style.margin = "0px";
					}
					this.containerNode.style.padding = "0px 0px 0px 1%";
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
			}

			if(!array.some(this.getChildren(), function(child){ return child.iconNode1; })){
				domClass.add(this.domNode, "mblTabBarNoIcons");
			}else{
				domClass.remove(this.domNode, "mblTabBarNoIcons");
			}

			if(!array.some(this.getChildren(), function(child){ return child.label; })){
				domClass.add(this.domNode, "mblTabBarNoText");
			}else{
				domClass.remove(this.domNode, "mblTabBarNoText");
			}
		}
	});

});
