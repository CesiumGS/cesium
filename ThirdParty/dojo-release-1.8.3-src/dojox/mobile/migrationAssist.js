/*

About migrationAssist
=====================

The migrationAssist is a Dojo module that helps you migrate your
dojox/mobile 1.6/1.7 applications to 1.8. To enable migrationAssist,
all you need to do is require this module as shown in the examples below.

	<script language="JavaScript" type="text/javascript">
		dojo.require("dojox.mobile.migrationAssist");
		dojo.require("dojox.mobile"); // This is a mobile app.
		....
	</script>

	<script language="JavaScript" type="text/javascript">
		require([
			"dojox/mobile/migrationAssist",
			"dojox/mobile", // This is a mobile app.
			....
		]);
	</script>

If your application uses deprecated or no longer available functions,
this module detects them and displays messages in the browser console.

Also, it tries to dynamically fix them as much as possible so that
the target application can work somehow.

Note, however, that the purpose of migrationAssist is not to
run the older applications as they are, but to assist migration.


Changes from 1.6/1.7 to 1.8
===========================

Carousel
--------
 - Carousel has no backward compatibility, since it was experimental in 1.7.
   There are two subclasses that support data stores.
   Use DataCarousel if you want to use carousel with dojo/data.
   Use StoreCarousel if you want to use carousel with dojo/store.

FixedSplitter
-------------
 - FixedSplitter.css is no longer in the themes/common folder.
   It is in the device theme folder. (e.g. themes/iphone/FixedSplitter.css)

FlippableView
-------------
 - FlippableView was deprecated in 1.7, and removed in 1.8. Use SwapView instead.

ListItem
--------
 - The sync property is no longer supported. It always behaves asynchronously.
 - The btnClass property is no longer supported. Use rightIcon instead.
 - The btnClass2 property is no longer supported. Use rightIcon2 instead.

SpinWheel
---------
 - SpinWheel.css is no longer in the themes/common folder.
   It is in the device theme folder. (e.g. themes/iphone/SpinWheel.css)
 - getValue() is no longer supported. Use get("values") instead.
 - setValue() is no longer supported. Use set("values", newValue) instead.

SpinWheelSlot
-------------
 - getValue() is no longer supported. Use get("value") instead.
 - getKey() is no longer supported. Use get("key") instead.
 - setValue() is no longer supported. Use set("value", newValue) instead.

Switch
------
 - When you place it in a ListItem, class="mblItemSwitch" is no longer necessary.

TabBar
------
- In 1.7 or older, barType="segmentedControl" produced different UIs according to the
  current theme. In the iphone theme, it was a segmented control, but in other themes,
  it was tabs with or without icons. In 1.8, however, barType="segmentedControl"
  always produces a segmented control UI regardless of the current theme.
  If you still need the old behavior,
      barType:{"iphone_theme":"segmentedControl","*":"tallTab"}
  should produce a segmented control for the iphone theme, and a tall tab bar for
  the other themes. You need to use deviceTheme.js to specify barType that way.
  Also, if you want to hide the tab icons on the segmented control in the iphone theme,
  you could apply a css like this:
      <style>
      .iphone_theme .mblTabBarSegmentedControl .mblTabBarButtonIconArea {
          display: none;
      }
      </style>
  See test_ScrollableView-demo.html for an example usage.

TabBarButton
-------------
 - Specifying a DOM Button with the class attribute like class="mblDomButtonWhitePlus"
   is no longer supported. Use icon="mblDomButtonWhitePlus" instead.
 - select() and deselect() are no longer supported. Use set("selected", boolean) instead.

ToolBarButton
-------------
 - Specifying the button color style with the class attribute like class="mblColorBlue"
   is no longer supported. Use defaultColor="mblColorBlue" instead.
 - Specifying a DOM Button with the class attribute like class="mblDomButtonWhitePlus"
   is no longer supported. Use icon="mblDomButtonWhitePlus" instead.
 - select() and deselect() are no longer supported. Use set("selected", boolean) instead.

dojox/mobile/parser
-------------------
 - dojox/mobile/parser no longer accepts array-type attribute like
     labels="['A','B','C','D','E']"
   Instead, you should specify like labels="A,B,C,D,E", which is the format dojo/parser
   accepts.

bookmarkable
------------
 - To enable the bookmarkable feature, require dojox/mobile/bookmarkable
   instead of dojo/hash

*/

define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dojo/ready",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./_ItemBase",
	"./common", 
	"./FixedSplitterPane",
	"./Heading",
	"./iconUtils",
	"./ListItem",
	"./RoundRect",
	"./SpinWheel",
	"./SpinWheelSlot",
	"./SwapView",
	"./TabBarButton",
	"./ToolBarButton",
	"./View"
], function(declare, lang, win, domClass, domConstruct, domStyle, ready, Container, WidgetBase, _ItemBase, mobile, FixedSplitterPane, Heading, iconUtils, ListItem, RoundRect, SpinWheel, SpinWheelSlot, SwapView, TabBarButton, ToolBarButton, View){

	// module:
	//		dojox/mobile/migrationAssist

	var currentTheme;

	var MigrationAssist = function(){
		// summary:
		//		Dojo Mobile 1.6/1.7 to 1.8 migration assistance.

		var get = function(w, key){
			return w[key] || w.srcNodeRef && w.srcNodeRef.getAttribute(key);
		};

		this.dispatch = function(/*String*/cls, /*Widget*/ w){
			var base = cls.replace(/.*\./, "");
			this["check" + base] && this["check" + base](w);
		};

		this.checkCarousel = function(/*Widget*/ w){
			console.log('[MIG:error] Carousel has no backward compatibility, since it was experimental in 1.7. The new Carousel supports dojo/store instead of dojo/data.');
		};

		this.checkFixedSplitter = function(/*Widget*/ w){
			// FixedSplitter.css has been moved from the themes/common folder
			// to the device theme folder such as themes/android.
			if(!this._fixedSplitter_css_checked){
				this._fixedSplitter_css_checked = true;
				var dummy = domConstruct.create("div", {
					className: "mblFixedSplitter"
				}, win.body());
				if(domStyle.get(dummy, "height") == 0){
					domConstruct.create("link", {
						href: "../themes/android/FixedSplitter.css",
						type: "text/css",
						rel: "stylesheet"
					}, win.doc.getElementsByTagName('head')[0]);
					console.log('[MIG:fixed] FixedSplitter.css does not seem to be loaded. Loaded it for you just now. It is in the device theme folder.');
				}
				win.body().removeChild(dummy);
				setTimeout(function(){
					w.resize();
				}, 1000);
			}
		};

		this.checkFixedSplitterPane = function(/*Widget*/ w){
			console.log('[MIG:fixed] FixedSplitterPane: Deprecated. Use dojox/mobile/Container instead.');
		};
		this.checkFixedSplitter = function(/*Widget*/ w){
			// FixedSplitter.css has been moved from the themes/common folder
			// to the device theme folder such as themes/android.
			if(!this._fixedSplitter_css_checked){
				this._fixedSplitter_css_checked = true;
				var dummy = domConstruct.create("div", {
					className: "mblFixedSplitter"
				}, win.body());
				if(domStyle.get(dummy, "height") == 0){
					domConstruct.create("link", {
						href: "../themes/android/FixedSplitter.css",
						type: "text/css",
						rel: "stylesheet"
					}, win.doc.getElementsByTagName('head')[0]);
					console.log('[MIG:fixed] FixedSplitter.css does not seem to be loaded. Loaded it for you just now. It is in the device theme folder.');
				}
				win.body().removeChild(dummy);
				setTimeout(function(){
					w.resize();
				}, 1000);
			}
		};

		this.checkListItem = function(/*Widget*/ w){
			if(w.sync !== undefined || w.srcNodeRef && w.srcNodeRef.getAttribute("sync")){
				console.log('[MIG:fixed] ListItem: The sync property is no longer supported. (async always)');
			}
			if(w.btnClass !== undefined || w.srcNodeRef && w.srcNodeRef.getAttribute("btnClass")){
				console.log('[MIG:fixed] ListItem: The btnClass property is no longer supported. Use rightIcon instead.');
				w.rightIcon = w.btnClass || w.srcNodeRef && w.srcNodeRef.getAttribute("btnClass");
			}
			if(w.btnClass2 !== undefined || w.srcNodeRef && w.srcNodeRef.getAttribute("btnClass2")){
				console.log('[MIG:fixed] ListItem: The btnClass2 property is no longer supported. Use rightIcon2 instead.');
				w.rightIcon2 = w.btnClass2 || w.srcNodeRef && w.srcNodeRef.getAttribute("btnClass2");
			}
		};

		this.checkSpinWheelSlot = function(/*Widget*/ w){
			if(w.labels && w.labels[0] && w.labels[0].charAt(0) === '['){
				for(var i = 0; i < w.labels.length; i++){
					w.labels[i] = w.labels[i].replace(/^\[*[\'\"]*/, '');
					w.labels[i] = w.labels[i].replace(/[\'\"]*\]*$/, '');
				}
				console.log('[MIG:fixed] SpinWheelSlot: dojox/mobile/parser no longer accepts array-type attribute like labels="[\'A\',\'B\',\'C\',\'D\',\'E\']". Specify as labels="A,B,C,D,E" instead.' );
			}
		};

		this.checkSwapView = function(/*Widget*/ w){
			var n = w.srcNodeRef;
			if(n){
				var type = n.getAttribute("dojoType") || n.getAttribute("data-dojo-type");
				if(type === "dojox.mobile.FlippableView"){
					console.log('[MIG:fixed] FlippableView: FlippableView is no longer supported. Use SwapView instead.');
				}
			}
		};

		this.checkSwitch = function(/*Widget*/ w){
			if(w["class"] === "mblItemSwitch"){
				console.log('[MIG:fixed] Switch: class="mblItemSwitch" is no longer necessary.');
			}
		};

		this.checkTabBar = function(/*Widget*/ w){
			if(get(w, "barType") === "segmentedControl"){
				console.log('[MIG:warning] TabBar: segmentedControl in 1.8 produces the same UI regardless of the current theme. See the inline doc in migrationAssist.js for details.');
				domConstruct.create("style", {
					innerHTML: ".iphone_theme .mblTabBarSegmentedControl .mblTabBarButtonIconArea { display: none; }"
				}, win.doc.getElementsByTagName('head')[0]);
			}
		};

		this.checkTabBarButton = function(/*Widget*/ w){
			if((w["class"] || "").indexOf("mblDomButton") === 0){
				console.log('[MIG:fixed] TabBarButton: Use icon="' + w["class"] + '" instead of class="' + w["class"] + '".');
				w.icon = w["class"];
				w["class"] = "";
				if(w.srcNodeRef){
					w.srcNodeRef.className = "";
				}
			}
		};

		this.checkToolBarButton = function(/*Widget*/ w){
			if((w["class"] || "").indexOf("mblColor") === 0){
				console.log('[MIG:fixed] ToolBarButton: Use defaultColor="' + w["class"] + '" instead of class="' + w["class"] + '".');
				w.defaultColor = w["class"];
				w["class"] = "";
				if(w.srcNodeRef){
					w.srcNodeRef.className = "";
				}
			}

			if((w["class"] || "").indexOf("mblDomButton") === 0){
				console.log('[MIG:fixed] ToolBarButton: Use icon="' + w["class"] + '" instead of class="' + w["class"] + '".');
				w.icon = w["class"];
				w["class"] = "";
				if(w.srcNodeRef){
					w.srcNodeRef.className = "";
				}
			}
		};
	};

	dojox.mobile.FlippableView = SwapView;

	var migrationAssist = new MigrationAssist();

	// Hide from the API doc tool, we want to get the documentation for the normal WidgetBase.postMixInProperties()
	WidgetBase.prototype.postMixInProperties = /*===== WidgetBase.prototype.postMixInProperties || =====*/ function(){
		migrationAssist.dispatch(this.declaredClass, this);
		dojo.forEach([FixedSplitterPane, Heading, RoundRect, SpinWheel, TabBarButton, ToolBarButton, View], function(module){
			if(this.declaredClass !== module.prototype.declaredClass && this instanceof module){
				migrationAssist.dispatch(module.prototype.declaredClass, this);
			}
		}, this);

	};


	extendSelectFunction = function(obj) {
		lang.extend(obj, {
			select: function(){
				console.log('[MIG:fixed] ' + this.declaredClass + '(id='+this.id+'): Use set("selected", boolean) instead of select/deselect.');
				obj.prototype.set.apply(this, ["selected", !arguments[0]]);
			},
			deselect: function(){
				this.select(true);
			}
		});
	};

	extendSelectFunction(ToolBarButton);
	extendSelectFunction(TabBarButton);

	lang.extend(ListItem, {
		set: function(key, value){
			if(key === "btnClass"){
				console.log('[MIG:fixed] ' + this.declaredClass + '(id='+this.id+'): Use set("rightIcon",x) instead of set("btnClass",x).');
				key = "rightIcon";
			}else if(key === "btnClass2"){
				console.log('[MIG:fixed] ' + this.declaredClass + '(id='+this.id+'): Use set("rightIcon2",x) instead of set("btnClass2",x).');
				key = "rightIcon2";
			}
			WidgetBase.prototype.set.apply(this, [key, value]);
		}
	});

	lang.extend(SpinWheel, {
		getValue: function(){
			console.log('[MIG:fixed] SpinWheel: getValue() is no longer supported. Use get("values") instead.');
			return this.get("values");
		},
		setValue: function(newValue){
			console.log('[MIG:fixed] SpinWheel: setValue() is no longer supported. Use set("values",x) instead.');
			return this.set("values", newValue);
		}
	});

	lang.extend(SpinWheelSlot, {
		getValue: function(){
			console.log('[MIG:fixed] SpinWheelSlot: getValue() is no longer supported. Use get("value") instead.');
			return this.get("value");
		},
		getKey: function(){
			console.log('[MIG:fixed] SpinWheelSlot: getKey() is no longer supported. Use get("key") instead.');
			return this.get("key");
		},
		setValue: function(newValue){
			console.log('[MIG:fixed] SpinWheelSlot: setValue() is no longer supported. Use set("value",x) instead.');
			return this.set("value", newValue);
		}
	});

	lang.mixin(mobile, {
		createDomButton: function(){
			console.log('[MIG:fixed] dojox.mobile(id='+arguments[0].id+'): createDomButton was moved to iconUtils.');
			return iconUtils.createDomButton.apply(this, arguments);
		}
	});

	// check css
	var cssFiles = [], i, j;

	// collect @import
	var s = win.doc.styleSheets;
	for(i = 0; i < s.length; i++){
		if(s[i].href){ continue; }
		var r = s[i].cssRules || s[i].imports;
		if(!r){ continue; }
		for(j = 0; j < r.length; j++){
			if(r[j].href){
				cssFiles.push(r[j].href);
			}
		}
	}

	// collect <link>
	var elems = win.doc.getElementsByTagName("link");
	for(i = 0; i < elems.length; i++){
		cssFiles.push(elems[i].href);
	}

	for(i = 0; i < cssFiles.length; i++){
		if(cssFiles[i].indexOf("/iphone/") !== -1){
			currentTheme = "iphone";
		}else if(cssFiles[i].indexOf("/android/") !== -1){
			currentTheme = "android";
		}else if(cssFiles[i].indexOf("/blackberry/") !== -1){
			currentTheme = "blackberry";
		}else if(cssFiles[i].indexOf("/custom/") !== -1){
			currentTheme = "custom";
		}
		domClass.add(win.doc.documentElement, currentTheme + "_theme");

		if(cssFiles[i].match(/themes\/common\/(FixedSplitter.css)|themes\/common\/(SpinWheel.css)/)){
			console.log('[MIG:error] ' + (RegExp.$1 || RegExp.$2) + ' is no longer in the themes/common folder. It is in the device theme folder.');
		}
	}

	ready(function(){
		if(dojo.hash){
			console.log('[MIG:fixed] dojo/hash detected. If you would like to enable the bookmarkable feature, require dojox/mobile/bookmarkable instead of dojo/hash');
			if(dojo.require){
				dojo["require"]("dojox.mobile.bookmarkable");
			}else{
				require(["dojox/mobile/bookmarkable"]);
			}
		}
	});

	// Return singleton.  (TODO: can we replace LazyLoadUtils class and singleton w/a simple hash of functions?)
	return migrationAssist;
});
