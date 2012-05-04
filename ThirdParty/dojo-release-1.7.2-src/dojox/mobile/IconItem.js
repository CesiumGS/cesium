define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/registry",	// registry.byId
	"./common",
	"./_ItemBase",
	"./TransitionEvent"
], function(dojo, array, declare, lang, has, win, domAttr, domClass, domConstruct, domStyle, registry, common, ItemBase, TransitionEvent){

/*=====
	var ItemBase = dojox.mobile._ItemBase;
=====*/

	// module:
	//		dojox/mobile/IconItem
	// summary:
	//		An icon item widget.

	return declare("dojox.mobile.IconItem", ItemBase, {
		// summary:
		//		An icon item widget.
		// description:
		//		IconItem represents an item that has an application component
		//		and its icon image. You can tap the icon to open the
		//		corresponding application component. You can also use the icon
		//		to move to a different view by specifying either of the moveTo,
		//		href or url parameters.

		// lazy: String
		//		If true, the content of the item, which includes dojo markup, is
		//		instantiated lazily. That is, only when the icon is opened by
		//		the user, the required modules are loaded and dojo widgets are
		//		instantiated.
		lazy: false,

		// requires: String
		//		Comma-separated required module names to be loaded. All the
		//		modules specified with dojoType and their depending modules are
		//		automatically loaded by the IconItem. If you need other extra
		//		modules to be loaded, use this parameter. If lazy is true, the
		//		specified required modules are loaded when the user opens the
		//		icon for the first time.
		requires: "",

		// timeout: String
		//		Duration of highlight in seconds.
		timeout: 10,

		// closeBtnClass: String
		//		A class name of a DOM button to be used as a close button.
		closeBtnClass: "mblDomButtonBlueMinus",

		// closeBtnProp: String
		//		Properties for the close button.
		closeBtnProp: null,


		templateString: '<div class="mblIconArea" dojoAttachPoint="iconDivNode">'+
							'<div><img src="${icon}" dojoAttachPoint="iconNode"></div><span dojoAttachPoint="labelNode1"></span>'+
						'</div>',
		templateStringSub: '<li class="mblIconItemSub" lazy="${lazy}" style="display:none;" dojoAttachPoint="contentNode">'+
						'<h2 class="mblIconContentHeading" dojoAttachPoint="closeNode">'+
							'<div class="${closeBtnClass}" style="position:absolute;left:4px;top:2px;" dojoAttachPoint="closeIconNode"></div><span dojoAttachPoint="labelNode2"></span>'+
						'</h2>'+
						'<div class="mblContent" dojoAttachPoint="containerNode"></div>'+
					'</li>',

		createTemplate: function(s){
			array.forEach(["lazy","icon","closeBtnClass"], function(v){
				while(s.indexOf("${"+v+"}") != -1){
					s = s.replace("${"+v+"}", this[v]);
				}
			}, this);
			var div = win.doc.createElement("DIV");
			div.innerHTML = s;
	
			/*
			array.forEach(query("[dojoAttachPoint]", domNode), function(node){
				this[node.getAttribute("dojoAttachPoint")] = node;
			}, this);
			*/

			var nodes = div.getElementsByTagName("*");
			var i, len, s1;
			len = nodes.length;
			for(i = 0; i < len; i++){
				s1 = nodes[i].getAttribute("dojoAttachPoint");
				if(s1){
					this[s1] = nodes[i];
				}
			}
			if(this.closeIconNode && this.closeBtnProp){
				domAttr.set(this.closeIconNode, this.closeBtnProp);
			}
			var domNode = div.removeChild(div.firstChild);
			div = null;
			return domNode;
		},

		buildRendering: function(){
			this.inheritParams();
			var node = this.createTemplate(this.templateString);
			this.subNode = this.createTemplate(this.templateStringSub);
			this.subNode._parentNode = this.domNode; // [custom property]

			this.domNode = this.srcNodeRef || domConstruct.create("LI");
			domClass.add(this.domNode, "mblIconItem");
			if(this.srcNodeRef){
				// reparent
				for(var i = 0, len = this.srcNodeRef.childNodes.length; i < len; i++){
					this.containerNode.appendChild(this.srcNodeRef.firstChild);
				}
			}
			this.domNode.appendChild(node);
		},

		postCreate: function(){
			common.createDomButton(this.closeIconNode, {
				top: "-2px",
				left: "1px"
			});
			this.connect(this.iconNode, "onmousedown", "onMouseDownIcon");
			this.connect(this.iconNode, "onclick", "iconClicked");
			this.connect(this.closeIconNode, "onclick", "closeIconClicked");
			this.connect(this.iconNode, "onerror", "onError");
		},
	
		highlight: function(){
			// summary:
			//		Shakes the icon 10 seconds.
			domClass.add(this.iconDivNode, "mblVibrate");
			if(this.timeout > 0){
				var _this = this;
				setTimeout(function(){
					_this.unhighlight();
				}, this.timeout*1000);
			}
		},

		unhighlight: function(){
			// summary:
			//		Stops shaking the icon.
			domClass.remove(this.iconDivNode, "mblVibrate");
		},

		instantiateWidget: function(e){
			// summary:
			//		Instantiates the icon content.

			// avoid use of query
			/*
			var list = query('[dojoType]', this.containerNode);
			for(var i = 0, len = list.length; i < len; i++){
				dojo["require"](list[i].getAttribute("dojoType"));
			}
			*/
	
			var nodes = this.containerNode.getElementsByTagName("*");
			var len = nodes.length;
			var s;
			for(var i = 0; i < len; i++){
				s = nodes[i].getAttribute("dojoType");
				if(s){
					dojo["require"](s);
				}
			}
	
			if(len > 0){
				dojo.parser.parse(this.containerNode);
			}
			this.lazy = false;
		},
	
		isOpen: function(e){
			// summary:
			//		Returns true if the icon is open.
			return this.containerNode.style.display != "none";
		},
	
		onMouseDownIcon: function (e){
			domStyle.set(this.iconNode, "opacity", this.getParent().pressedIconOpacity);
		},
	
		iconClicked: function(e){
			if(e){
				this.setTransitionPos(e);
				setTimeout(lang.hitch(this, function(d){ this.iconClicked(); }), 0);
				return;
			}

			if (this.href && this.hrefTarget) {
				common.openWindow(this.href, this.hrefTarget);
				dojo.style(this.iconNode, "opacity", 1);
				return;
			}

			var transOpts;
			if(this.moveTo || this.href || this.url || this.scene){
				transOpts = {moveTo: this.moveTo, href: this.href, url: this.url, scene: this.scene, transitionDir: this.transitionDir, transition: this.transition};
			}else if(this.transitionOptions){
				transOpts = this.transitionOptions;
			}
			if(transOpts){
				setTimeout(lang.hitch(this, function(d){
					domStyle.set(this.iconNode, "opacity", 1);
				}), 1500);
			}else{
				return this.open(e);
			}
	
			if(transOpts){
				return new TransitionEvent(this.domNode,transOpts,e).dispatch();
			}
		},
	
		closeIconClicked: function(e){
			if(e){
				setTimeout(lang.hitch(this, function(d){ this.closeIconClicked(); }), 0);
				return;
			}
			this.close();
		},
	
		open: function(e){
			// summary:
			//		Opens the icon content, or makes a transition.
			var parent = this.getParent(); // IconContainer
			if(this.transition == "below"){
				if(parent.single){
					parent.closeAll();
					domStyle.set(this.iconNode, "opacity", this.getParent().pressedIconOpacity);
				}
				this._open_1();
			}else{
				parent._opening = this;
				if(parent.single){
					this.closeNode.style.display = "none";
					parent.closeAll();
					var view = registry.byId(parent.id+"_mblApplView");
					view._heading._setLabelAttr(this.label);
				}
				var transOpts = this.transitionOptions || {transition: this.transition, transitionDir: this.transitionDir, moveTo: parent.id + "_mblApplView"};		
				new TransitionEvent(this.domNode, transOpts, e).dispatch();
			}
		},
	
		_open_1: function(){
			this.contentNode.style.display = "";
			this.unhighlight();
			if(this.lazy){
				if(this.requires){
					array.forEach(this.requires.split(/,/), function(c){
						dojo["require"](c);
					});
				}
				this.instantiateWidget();
			}
			this.contentNode.scrollIntoView();
			this.onOpen();
		},
	
		close: function(){
			// summary:
			//		Closes the icon content.
			if(has("webkit")){
				var t = this.domNode.parentNode.offsetWidth/8;
				var y = this.iconNode.offsetLeft;
				var pos = 0;
				for(var i = 1; i <= 3; i++){
					if(t*(2*i-1) < y && y <= t*(2*(i+1)-1)){
						pos = i;
						break;
					}
				}
				domClass.add(this.containerNode.parentNode, "mblCloseContent mblShrink"+pos);
			}else{
				this.containerNode.parentNode.style.display = "none";
			}
			domStyle.set(this.iconNode, "opacity", 1);
			this.onClose();
		},
	
		onOpen: function(){
			// summary:
			//		Stub method to allow the application to connect to.
		},
	
		onClose: function(){
			// summary:
			//		Stub method to allow the application to connect to.
		},
	
		onError: function(){
			var icon = this.getParent().defaultIcon;
			if(icon){
				this.iconNode.src = icon;
			}
		},
	
		_setIconAttr: function(icon){
			if(!this.getParent()){ return; } // icon may be invalid because inheritParams is not called yet
			this.icon = icon;
			common.createIcon(icon, this.iconPos, this.iconNode, this.alt);
			if(this.iconPos){
				domClass.add(this.iconNode, "mblIconItemSpriteIcon");
				var arr = this.iconPos.split(/[ ,]/);
				var p = this.iconNode.parentNode;
				domStyle.set(p, {
					width: arr[2] + "px",
					top: Math.round((p.offsetHeight - arr[3]) / 2) + 1 + "px",
					margin: "auto"
				});
			}
		},
	
		_setLabelAttr: function(/*String*/text){
			this.label = text;
			var s = this._cv ? this._cv(text) : text;
			this.labelNode1.innerHTML = s;
			this.labelNode2.innerHTML = s;
		}
	});
});
