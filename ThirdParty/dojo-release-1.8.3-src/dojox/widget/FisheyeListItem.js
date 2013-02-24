define(["dojo/_base/declare", "dojo/_base/sniff", "dojo/dom", "dojo/dom-attr", "dojo/dom-class", "dojo/dom-style", "dojo/dom-construct", "dojo/_base/window", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_Contained"],
	function(declare, has, dom, attr, domClass, style, construct, winUtil, _WidgetBase, _TemplatedMixin, _Contained){

	return declare("dojox.widget.FisheyeListItem",
		[_WidgetBase, _TemplatedMixin, _Contained], {
		// summary:
		//		Menu item inside of a FisheyeList.
		//		See FisheyeList documentation for details on usage.

		// iconSrc: String
		//		pathname to image file (jpg, gif, png, etc.) of icon for this menu item
		iconSrc: "",

		// label: String
		//		label to print next to the icon, when it is moused-over
		label: "",

		// id: String
		//		will be set to the id of the orginal div element
		id: "",

		templateString:
			'<div class="dojoxFisheyeListItem">' +
			'  <img class="dojoxFisheyeListItemImage" data-dojo-attach-point="imgNode" data-dojo-attach-event="onmouseover:onMouseOver,onmouseout:onMouseOut,onclick:onClick">' +
			'  <div class="dojoxFisheyeListItemLabel" data-dojo-attach-point="lblNode"></div>' +
			'</div>',

		_isNode: function(/* object */wh){
			// summary:
			//		checks to see if wh is actually a node.
			if(typeof Element == "function"){
				try{
					return wh instanceof Element;   // Boolean
				}catch(e){}
			}else{
				// best-guess
				return wh && !isNaN(wh.nodeType);   // Boolean
			}
			return false;
		},

		_hasParent: function(/*Node*/ node){
			// summary:
			//		returns whether or not node is a child of another node.
			return Boolean(node && node.parentNode && this._isNode(node.parentNode));   // Boolean
		},

		postCreate: function(){

			// set image
			var parent;
			if((this.iconSrc.toLowerCase().substring(this.iconSrc.length-4)==".png") && has("ie") < 7){
				/* we set the id of the new fisheyeListItem to the id of the div defined in the HTML */
				if(this._hasParent(this.imgNode) && this.id != ""){
					parent = this.imgNode.parentNode;
					attr.set(parent, "id", this.id);
				}
				style.set(this.imgNode, "filter", "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+this.iconSrc+"', sizingMethod='scale')");
				this.imgNode.src = this._blankGif.toString();
			}else{
				if(this._hasParent(this.imgNode) && this.id != ""){
					parent = this.imgNode.parentNode;
					attr.set(parent, "id", this.id);
				}
				this.imgNode.src = this.iconSrc;
			}

			// Label
			if(this.lblNode){
				construct.place(winUtil.doc.createTextNode(this.label), this.lblNode);
			}
			dom.setSelectable(this.domNode, false);
			this.startup();
		},

		startup: function(){
			this.parent = this.getParent();
		},

		onMouseOver: function(/*Event*/ e){
			// summary:
			//		callback when user moves mouse over this menu item
			//		in conservative mode, don't activate the menu until user mouses over an icon
			if(!this.parent.isOver){
				this.parent._setActive(e);
			}
			if(this.label != "" ){
				domClass.add(this.lblNode, "dojoxFishSelected");
				this.parent._positionLabel(this);
			}
		},

		onMouseOut: function(/*Event*/ e){
			// summary:
			//		callback when user moves mouse off of this menu item
			domClass.remove(this.lblNode, "dojoxFishSelected");
		},

		onClick: function(/*Event*/ e){
			// summary:
			//		user overridable callback when user clicks this menu item
		}
	});
});