define([
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"./common",
	"./_ItemBase"
], function(declare, win, domClass, domConstruct, domStyle, common, ItemBase){
/*=====
	var ItemBase = dojox.mobile._ItemBase;
=====*/

	// module:
	//		dojox/mobile/ToolBarButton
	// summary:
	//		A button widget that is placed in the Heading widget.

	return declare("dojox.mobile.ToolBarButton", ItemBase, {
		// summary:
		//		A button widget that is placed in the Heading widget.
		// description:
		//		ToolBarButton is a button that is placed in the Heading
		//		widget. It is a subclass of dojox.mobile._ItemBase just like
		//		ListItem or IconItem. So, unlike Button, it has basically the
		//		same capability as ListItem or IconItem, such as icon support,
		//		transition, etc.

		// selected: Boolean
		//		If true, the button is in the selected status.
		selected: false,

		// btnClass: String
		//		Deprecated.
		btnClass: "",

		/* internal properties */	
		_defaultColor: "mblColorDefault",
		_selColor: "mblColorDefaultSel",

		buildRendering: function(){
			this.domNode = this.containerNode = this.srcNodeRef || win.doc.createElement("div");
			this.inheritParams();
			domClass.add(this.domNode, "mblToolBarButton mblArrowButtonText");
			var color;
			if(this.selected){
				color = this._selColor;
			}else if(this.domNode.className.indexOf("mblColor") == -1){
				color = this._defaultColor;
			}
			domClass.add(this.domNode, color);
	
			if(!this.label){
				this.label = this.domNode.innerHTML;
			}

			if(this.icon && this.icon != "none"){
				this.iconNode = domConstruct.create("div", {className:"mblToolBarButtonIcon"}, this.domNode);
				common.createIcon(this.icon, this.iconPos, null, this.alt, this.iconNode);
				if(this.iconPos){
					domClass.add(this.iconNode.firstChild, "mblToolBarButtonSpriteIcon");
				}
			}else{
				if(common.createDomButton(this.domNode)){
					domClass.add(this.domNode, "mblToolBarButtonDomButton");
				}else{
					domClass.add(this.domNode, "mblToolBarButtonText");
				}
			}
			this.connect(this.domNode, "onclick", "onClick");
		},
	
		select: function(){
			// summary:
			//		Makes this widget in the selected state.
			domClass.toggle(this.domNode, this._selColor, !arguments[0]);
			this.selected = !arguments[0];
		},
		
		deselect: function(){
			// summary:
			//		Makes this widget in the deselected state.
			this.select(true);
		},
	
		onClick: function(e){
			this.setTransitionPos(e);
			this.defaultClickAction();
		},
	
		_setBtnClassAttr: function(/*String*/btnClass){
			var node = this.domNode;
			if(node.className.match(/(mblDomButton\w+)/)){
				domClass.remove(node, RegExp.$1);
			}
			domClass.add(node, btnClass);
			if(common.createDomButton(this.domNode)){
				domClass.add(this.domNode, "mblToolBarButtonDomButton");
			}
		},

		_setLabelAttr: function(/*String*/text){
			this.label = text;
			this.domNode.innerHTML = this._cv ? this._cv(text) : text;
		}
	});
});
