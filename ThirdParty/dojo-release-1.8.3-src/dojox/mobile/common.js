define([
	"dojo/_base/array",
	"dojo/_base/config",
	"dojo/_base/connect",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/ready",
	"dijit/registry",
	"./sniff",
	"./uacss" // (no direct references)
], function(array, config, connect, lang, win, domClass, domConstruct, ready, registry, has){

	// module:
	//		dojox/mobile/common

	var dm = lang.getObject("dojox.mobile", true);

	dm.getScreenSize = function(){
		// summary:
		//		Returns the dimensions of the browser window.
		return {
			h: win.global.innerHeight || win.doc.documentElement.clientHeight,
			w: win.global.innerWidth || win.doc.documentElement.clientWidth
		};
	};

	dm.updateOrient = function(){
		// summary:
		//		Updates the orientation specific CSS classes, 'dj_portrait' and
		//		'dj_landscape'.
		var dim = dm.getScreenSize();
		domClass.replace(win.doc.documentElement,
				  dim.h > dim.w ? "dj_portrait" : "dj_landscape",
				  dim.h > dim.w ? "dj_landscape" : "dj_portrait");
	};
	dm.updateOrient();

	dm.tabletSize = 500;
	dm.detectScreenSize = function(/*Boolean?*/force){
		// summary:
		//		Detects the screen size and determines if the screen is like
		//		phone or like tablet. If the result is changed,
		//		it sets either of the following css class to `<html>`:
		//
		//		- 'dj_phone'
		//		- 'dj_tablet'
		//
		//		and it publishes either of the following events:
		//
		//		- '/dojox/mobile/screenSize/phone'
		//		- '/dojox/mobile/screenSize/tablet'

		var dim = dm.getScreenSize();
		var sz = Math.min(dim.w, dim.h);
		var from, to;
		if(sz >= dm.tabletSize && (force || (!this._sz || this._sz < dm.tabletSize))){
			from = "phone";
			to = "tablet";
		}else if(sz < dm.tabletSize && (force || (!this._sz || this._sz >= dm.tabletSize))){
			from = "tablet";
			to = "phone";
		}
		if(to){
			domClass.replace(win.doc.documentElement, "dj_"+to, "dj_"+from);
			connect.publish("/dojox/mobile/screenSize/"+to, [dim]);
		}
		this._sz = sz;
	};
	dm.detectScreenSize();

	// dojox/mobile.hideAddressBarWait: Number
	//		The time in milliseconds to wait before the fail-safe hiding address
	//		bar runs. The value must be larger than 800.
	dm.hideAddressBarWait = typeof(config["mblHideAddressBarWait"]) === "number" ?
		config["mblHideAddressBarWait"] : 1500;

	dm.hide_1 = function(){
		// summary:
		//		Internal function to hide the address bar.
		// tags:
		//		private
		scrollTo(0, 1);
		dm._hidingTimer = (dm._hidingTimer == 0) ? 200 : dm._hidingTimer * 2;
		setTimeout(function(){ // wait for a while for "scrollTo" to finish
			if(dm.isAddressBarHidden() || dm._hidingTimer > dm.hideAddressBarWait){
				// Succeeded to hide address bar, or failed but timed out 
				dm.resizeAll();
				dm._hiding = false;
			}else{
				// Failed to hide address bar, so retry after a while
				setTimeout(dm.hide_1, dm._hidingTimer);
			}
		}, 50); //50ms is an experiential value
	};

	dm.hideAddressBar = function(/*Event?*/evt){
		// summary:
		//		Hides the address bar.
		// description:
		//		Tries to hide the address bar a couple of times. The purpose is to do 
		//		it as quick as possible while ensuring the resize is done after the hiding
		//		finishes.
		if(dm.disableHideAddressBar || dm._hiding){ return; }
		dm._hiding = true;
		dm._hidingTimer = has('iphone') ? 200 : 0; // Need to wait longer in case of iPhone
		var minH = screen.availHeight;
		if(has('android')){
			minH = outerHeight / devicePixelRatio;
			// On some Android devices such as Galaxy SII, minH might be 0 at this time.
			// In that case, retry again after a while. (200ms is an experiential value)
			if(minH == 0){
				dm._hiding = false;
				setTimeout(function(){ dm.hideAddressBar(); }, 200);
			}
			// On some Android devices such as HTC EVO, "outerHeight/devicePixelRatio"
			// is too short to hide address bar, so make it high enough
			if(minH <= innerHeight){ minH = outerHeight; }
			// On Android 2.2/2.3, hiding address bar fails when "overflow:hidden" style is
			// applied to html/body element, so force "overflow:visible" style
			if(has('android') < 3){
				win.doc.documentElement.style.overflow = win.body().style.overflow = "visible";
			}
		}
		if(win.body().offsetHeight < minH){ // to ensure enough height for scrollTo to work
			win.body().style.minHeight = minH + "px";
			dm._resetMinHeight = true;
		}
		setTimeout(dm.hide_1, dm._hidingTimer);
	};

	dm.isAddressBarHidden = function(){
		return pageYOffset === 1;
	};

	dm.resizeAll = function(/*Event?*/evt, /*Widget?*/root){
		// summary:
		//		Calls the resize() method of all the top level resizable widgets.
		// description:
		//		Finds all widgets that do not have a parent or the parent does not
		//		have the resize() method, and calls resize() for them.
		//		If a widget has a parent that has resize(), calling widget's
		//		resize() is its parent's responsibility.
		// evt:
		//		Native event object
		// root:
		//		If specified, searches the specified widget recursively for top-level
		//		resizable widgets.
		//		root.resize() is always called regardless of whether root is a
		//		top level widget or not.
		//		If omitted, searches the entire page.
		if(dm.disableResizeAll){ return; }
		connect.publish("/dojox/mobile/resizeAll", [evt, root]); // back compat
		connect.publish("/dojox/mobile/beforeResizeAll", [evt, root]);
		if(dm._resetMinHeight){
			win.body().style.minHeight = dm.getScreenSize().h + "px";
		} 
		dm.updateOrient();
		dm.detectScreenSize();
		var isTopLevel = function(w){
			var parent = w.getParent && w.getParent();
			return !!((!parent || !parent.resize) && w.resize);
		};
		var resizeRecursively = function(w){
			array.forEach(w.getChildren(), function(child){
				if(isTopLevel(child)){ child.resize(); }
				resizeRecursively(child);
			});
		};
		if(root){
			if(root.resize){ root.resize(); }
			resizeRecursively(root);
		}else{
			array.forEach(array.filter(registry.toArray(), isTopLevel),
					function(w){ w.resize(); });
		}
		connect.publish("/dojox/mobile/afterResizeAll", [evt, root]);
	};

	dm.openWindow = function(url, target){
		// summary:
		//		Opens a new browser window with the given URL.
		win.global.open(url, target || "_blank");
	};

	if(config["mblApplyPageStyles"] !== false){
		domClass.add(win.doc.documentElement, "mobile");
	}
	if(has('chrome')){
		// dojox/mobile does not load uacss (only _compat does), but we need dj_chrome.
		domClass.add(win.doc.documentElement, "dj_chrome");
	}

	if(win.global._no_dojo_dm){
		// deviceTheme seems to be loaded from a script tag (= non-dojo usage)
		var _dm = win.global._no_dojo_dm;
		for(var i in _dm){
			dm[i] = _dm[i];
		}
		dm.deviceTheme.setDm(dm);
	}

	// flag for Android transition animation flicker workaround
	has.add('mblAndroidWorkaround', 
			config["mblAndroidWorkaround"] !== false && has('android') < 3, undefined, true);
	has.add('mblAndroid3Workaround', 
			config["mblAndroid3Workaround"] !== false && has('android') >= 3, undefined, true);

	ready(function(){
		dm.detectScreenSize(true);

		if(config["mblAndroidWorkaroundButtonStyle"] !== false && has('android')){
			// workaround for the form button disappearing issue on Android 2.2-4.0
			domConstruct.create("style", {innerHTML:"BUTTON,INPUT[type='button'],INPUT[type='submit'],INPUT[type='reset'],INPUT[type='file']::-webkit-file-upload-button{-webkit-appearance:none;}"}, win.doc.head, "first");
		}
		if(has('mblAndroidWorkaround')){
			// add a css class to show view offscreen for android flicker workaround
			domConstruct.create("style", {innerHTML:".mblView.mblAndroidWorkaround{position:absolute;top:-9999px !important;left:-9999px !important;}"}, win.doc.head, "last");
		}

		//	You can disable hiding the address bar with the following dojoConfig.
		//	var dojoConfig = { mblHideAddressBar: false };
		var f = dm.resizeAll;
		if(config["mblHideAddressBar"] !== false &&
			navigator.appVersion.indexOf("Mobile") != -1 ||
			config["mblForceHideAddressBar"] === true){
			dm.hideAddressBar();
			if(config["mblAlwaysHideAddressBar"] === true){
				f = dm.hideAddressBar;
			}
		}

		var ios6 = has('iphone') >= 6; // Full-screen support for iOS6 or later 
		if((has('android') || ios6) && win.global.onorientationchange !== undefined){
			var _f = f;
			f = function(evt){
				var _conn = connect.connect(null, "onresize", null, function(e){
					connect.disconnect(_conn);
					_f(e);
				});
			};
			var curSize = dm.getScreenSize();
			var heightChangeThreshold = ios6 ? 20 : 100;
			var lastKeyUpTime = null;
			var isFormElement = null;
			if(ios6){
				// Surprisingly, on iOS 6, Mobile Safari fires a resize event when entering
				// characters using the virtual keyboard. Hence, to avoid inappropriately reacting 
				// on these resize events (see #16202), let's keep track of the time point of
				// the keyup events (the resize event is fired after it).
				connect.connect(null, "onkeyup", null, function(e){
					lastKeyUpTime = (new Date()).getTime();
				});
				isFormElement = function(/*DOMNode*/node){ // returns true if the given node is a form control
					if(node && node.nodeType !== 1){ node = node.parentNode; }
					if(!node || node.nodeType !== 1){ return false; }
					var t = node.tagName;
					return (t === "SELECT" || t === "INPUT" || t === "TEXTAREA" || t === "BUTTON");
				};
			}
			// Android: Watch for resize events when the virtual keyboard is shown/hidden.
			// The heuristic to detect this is that the screen width does not change
			// and the height changes by more than 100 pixels.
			//
			// iOS >= 6: Watch for resize events when entering or existing the new iOS6 
			// full-screen mode. The heuristic to detect this is that the screen width does not
			// change and the height changes by more than 20 pixels (the actual value depends on
			// whether the address bar is hidden or shown). Note that there are 2 resize events 
			// when entering the full-screen mode; the height is already changed when we get
			// the first event; no further height change at the second event (that we skip 
			// thanks to the height change test). Differently, there is only one resize event
			// when exiting the full-screen mode. (Tested on iPhone 4S under iOS 6.0.)
			connect.connect(null, "onresize", null, function(e){
				var newSize = dm.getScreenSize();
				if(newSize.w == curSize.w && Math.abs(newSize.h - curSize.h) >= heightChangeThreshold &&
					!(ios6 && 
						// do not react on resize events fired shortly after a keyup event (#16202)
						((lastKeyUpTime && ((new Date()).getTime() - lastKeyUpTime) < 400) ||
						// do not react on resize events fired while a form element is active (#16361)
						isFormElement(win.doc.activeElement)))){
					// keyboard has been shown/hidden (Android), or full-screen mode has
					// been entered/exited (iOS6+).
					if(ios6 && pageYOffset > 1){
						// On iOS6, besides the resize events fired when entering a character using
						// the virtual keyboard, there are sometimes resize events fired when editing 
						// input fields even long after a key event, or without any key having been touched. 
						// This situation sometimes occurs when repeatedly switching the focus back and forth
						// from one input field to another (the virtual keyboard being shown). 
						// Thus, to prevent the unexpected browser scroll due to the address bar hiding that 
						// the "_f" function may do, we call directly "resizeAll" if the browser vertical scroll 
						// is greater than 1, which is an indication that the virtual keyboard may be open. 
						// In this case, we do not want to interfer with the browser scroll done for placing 
						// the focused input field in the center of the visible area. Otherwise, we call
						// "resizeAll" such that the address bar hiding is performed (if appropriate), 
						// this being useful on both Android's case and for the iOS6 full-screen mode.
						dm.resizeAll();	
					}else{
						_f(e);
					}
				}
				curSize = newSize;
			});
		}
		
		connect.connect(null, win.global.onorientationchange !== undefined
			? "onorientationchange" : "onresize", null, f);
		win.body().style.visibility = "visible";
	});

	// TODO: return functions declared above in this hash, rather than
	// dojox.mobile.

	/*=====
	return {
		// summary:
		//		A common module for dojox/mobile.
		// description:
		//		This module includes common utility functions that are used by
		//		dojox/mobile widgets. Also, it provides functions that are commonly
		//		necessary for mobile web applications, such as the hide address bar
		//		function.
	};
	=====*/
	return dm;
});
