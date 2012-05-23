define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/registry",	// registry.byNode
	"./common",
	"./_ItemBase"
], function(declare, lang, win, domClass, domConstruct, registry, common, ItemBase){

/*=====
	var ItemBase = dojox.mobile._ItemBase;
=====*/

	// module:
	//		dojox/mobile/TabBarButton
	// summary:
	//		A button widget that is placed in the TabBar widget.

	return declare("dojox.mobile.TabBarButton", ItemBase,{
		// summary:
		//		A button widget that is placed in the TabBar widget.
		// description:
		//		TabBarButton is a button that is placed in the TabBar widget. It
		//		is a subclass of dojox.mobile._ItemBase just like ListItem or
		//		IconItem. So, unlike Button, it has similar capability as
		//		ListItem or IconItem, such as icon support, transition, etc.

		// icon1: String
		//		A path for the unselected (typically dark) icon. If icon is not
		//		specified, the iconBase parameter of the parent widget is used.
		icon1: "",

		// icon2: String
		//		A path for the selected (typically highlight) icon. If icon is
		//		not specified, the iconBase parameter of the parent widget or
		//		icon1 is used.
		icon2: "",

		// iconPos1: String
		//		The position of an aggregated unselected (typically dark)
		//		icon. IconPos1 is comma separated values like
		//		top,left,width,height (ex. "0,0,29,29"). If iconPos1 is not
		//		specified, the iconPos parameter of the parent widget is used.
		iconPos1: "",

		// iconPos2: String
		//		The position of an aggregated selected (typically highlight)
		//		icon. IconPos2 is comma separated values like
		//		top,left,width,height (ex. "0,0,29,29"). If iconPos2 is not
		//		specified, the iconPos parameter of the parent widget or
		//		iconPos1 is used.
		iconPos2: "",

		// selected: Boolean
		//		If true, the button is in the selected status.
		selected: false,

		// transition: String
		//		A type of animated transition effect.
		transition: "none",

		// tag: String
		//		A name of html tag to create as domNode.
		tag: "LI",

		/* internal properties */	
		selectOne: true,

	
		inheritParams: function(){
			// summary:
			//		Overrides dojox.mobile._ItemBase.inheritParams().
			if(this.icon && !this.icon1){ this.icon1 = this.icon; }
			var parent = this.getParent();
			if(parent){
				if(!this.transition){ this.transition = parent.transition; }
				if(this.icon1 && parent.iconBase &&
					parent.iconBase.charAt(parent.iconBase.length - 1) === '/'){
					this.icon1 = parent.iconBase + this.icon1;
				}
				if(!this.icon1){ this.icon1 = parent.iconBase; }
				if(!this.iconPos1){ this.iconPos1 = parent.iconPos; }
				if(this.icon2 && parent.iconBase &&
					parent.iconBase.charAt(parent.iconBase.length - 1) === '/'){
					this.icon2 = parent.iconBase + this.icon2;
				}
				if(!this.icon2){ this.icon2 = parent.iconBase || this.icon1; }
				if(!this.iconPos2){ this.iconPos2 = parent.iconPos || this.iconPos1; }
			}
		},
	
		buildRendering: function(){
			var a = this.anchorNode = domConstruct.create("A", {className:"mblTabBarButtonAnchor"});
			this.connect(a, "onclick", "onClick");
	
			this.box = domConstruct.create("DIV", {className:"mblTabBarButtonTextBox"}, a);
			var box = this.box;
			var label = "";
			var r = this.srcNodeRef;
			if(r){
				for(var i = 0, len = r.childNodes.length; i < len; i++){
					var n = r.firstChild;
					if(n.nodeType === 3){
						label += lang.trim(n.nodeValue);
					}
					box.appendChild(n);
				}
			}
			if(!this.label){
				this.label = label;
			}
	
			this.domNode = this.srcNodeRef || domConstruct.create(this.tag);
			this.containerNode = this.domNode;
			this.domNode.appendChild(a);
			if(this.domNode.className.indexOf("mblDomButton") != -1){
				// deprecated. TODO: remove this code in 1.8
				var domBtn = domConstruct.create("DIV", null, a);
				common.createDomButton(this.domNode, null, domBtn);
				domClass.add(this.domNode, "mblTabButtonDomButton");
				domClass.add(domBtn, "mblTabButtonDomButtonClass");
			}
			if((this.icon1 || this.icon).indexOf("mblDomButton") != -1){
				domClass.add(this.domNode, "mblTabButtonDomButton");
			}
		},
	
		startup: function(){
			if(this._started){ return; }
			this.inheritParams();
			var parent = this.getParent();
	
			var _clsName = parent ? parent._clsName : "mblTabBarButton";
			domClass.add(this.domNode, _clsName + (this.selected ? " mblTabButtonSelected" : ""));
	
			if(parent && parent.barType == "segmentedControl"){
				// proper className may not be set when created dynamically
				domClass.remove(this.domNode, "mblTabBarButton");
				domClass.add(this.domNode, parent._clsName);
				this.box.className = "";
			}
			this.set({icon1:this.icon1, icon2:this.icon2});
			this.inherited(arguments);
		},
	
		select: function(){
			// summary:
			//		Makes this widget in the selected state.
			if(arguments[0]){ // deselect
				this.selected = false;
				domClass.remove(this.domNode, "mblTabButtonSelected");
			}else{ // select
				this.selected = true;
				domClass.add(this.domNode, "mblTabButtonSelected");
				for(var i = 0, c = this.domNode.parentNode.childNodes; i < c.length; i++){
					if(c[i].nodeType != 1){ continue; }
					var w = registry.byNode(c[i]); // sibling widget
					if(w && w != this){
						w.deselect();
					}
				}
			}
			if(this.iconNode1){
				this.iconNode1.style.visibility = this.selected ? "hidden" : "";
			}
			if(this.iconNode2){
				this.iconNode2.style.visibility = this.selected ? "" : "hidden";
			}
		},
		
		deselect: function(){
			// summary:
			//		Makes this widget in the deselected state.
			this.select(true);
		},
	
		onClick: function(e){
			this.defaultClickAction();
		},
	
		_setIcon: function(icon, pos, num, sel){
			var i = "icon" + num, n = "iconNode" + num, p = "iconPos" + num;
			if(icon){ this[i] = icon; }
			if(pos){
				if(this[p] === pos){ return; }
				this[p] = pos;
			}
			if(icon && icon !== "none"){
				if(!this.iconDivNode){
					this.iconDivNode = domConstruct.create("DIV", {className:"mblTabBarButtonDiv"}, this.anchorNode, "first");
				}
				if(!this[n]){
					this[n] = domConstruct.create("div", {className:"mblTabBarButtonIcon"}, this.iconDivNode);
				}else{
					domConstruct.empty(this[n]);
				}
				common.createIcon(icon, this[p], null, this.alt, this[n]);
				if(this[p]){
					domClass.add(this[n].firstChild, "mblTabBarButtonSpriteIcon");
				}
				domClass.remove(this.iconDivNode, "mblTabBarButtonNoIcon");
				this[n].style.visibility = sel ? "hidden" : "";
			}else if(this.iconDivNode){
				domClass.add(this.iconDivNode, "mblTabBarButtonNoIcon");
			}
		},
	
		_setIcon1Attr: function(icon){
			this._setIcon(icon, null, 1, this.selected);
		},
	
		_setIcon2Attr: function(icon){
			this._setIcon(icon, null, 2, !this.selected);
		},
	
		_setIconPos1Attr: function(pos){
			this._setIcon(null, pos, 1, this.selected);
		},
	
		_setIconPos2Attr: function(pos){
			this._setIcon(null, pos, 2, !this.selected);
		},

		_setLabelAttr: function(/*String*/text){
			this.label = text;
			this.box.innerHTML = this._cv ? this._cv(text) : text;
		}
	});
});
