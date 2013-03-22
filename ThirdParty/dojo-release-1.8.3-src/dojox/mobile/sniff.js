define([
	"dojo/_base/window",
	"dojo/_base/sniff"
], function(win, has){

	var ua = navigator.userAgent;

	// BlackBerry (OS 6 or later only)
	has.add('bb', (ua.indexOf("BlackBerry") >= 0 || ua.indexOf("BB10")) && parseFloat(ua.split("Version/")[1]) || undefined, undefined, true);

	// Android
	has.add('android', parseFloat(ua.split("Android ")[1]) || undefined, undefined, true);

	// iPhone, iPod, or iPad
	// If iPod or iPad is detected, in addition to has('ipod') or has('ipad'),
	// has('iphone') will also have iOS version number.
	if(ua.match(/(iPhone|iPod|iPad)/)){
		var p = RegExp.$1.replace(/P/, 'p');
		var v = ua.match(/OS ([\d_]+)/) ? RegExp.$1 : "1";
		var os = parseFloat(v.replace(/_/, '.').replace(/_/g, ''));
		has.add(p, os, undefined, true);
		has.add('iphone', os, undefined, true);
	}

	if(has("webkit")){
		has.add('touch', (typeof win.doc.documentElement.ontouchstart != "undefined" &&
			navigator.appVersion.indexOf("Mobile") != -1) || !!has('android'), undefined, true);
	}

	/*=====
	return {
		// summary:
		//		This module sets has() flags based on the userAgent of the current browser.
	};
	=====*/
	return has;
});
