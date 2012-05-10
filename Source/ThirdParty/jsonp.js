/*!
* Lightweight JSONP fetcher
* Copyright 2010 Erik Karlsson. All rights reserved.
* BSD licensed
*/

/*global define*/
define(function() {
    "use strict";

/*
* Usage:
*
* JSONP.get( 'someUrl.php', {param1:'123', param2:'456'}, function(data){
*   //do something with data, which is the JSON object you should retrieve from someUrl.php
* });
*/
var JSONP = (function(){
	var counter = 0, head;
	function load(url) {
		var script = document.createElement('script'),
			done = false;
		script.src = url;
		script.async = true;

		script.onload = script.onreadystatechange = function() {
			if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
				done = true;
				script.onload = script.onreadystatechange = null;
				if ( script && script.parentNode ) {
					script.parentNode.removeChild( script );
				}
			}
		};
		if ( !head ) {
			head = document.getElementsByTagName('head')[0];
		}
		head.appendChild( script );
	}
	function jsonp(url, params, callback, callbackParameterName) {
		var query = "?";
		params = params || {};
		callbackParameterName = callbackParameterName || "callback";
		for ( var key in params ) {
			if ( params.hasOwnProperty(key) ) {
				query += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
			}
		}
		var uniqueName = "json" + (++counter);
		window[ uniqueName ] = function(data){
			callback(data);
			try {
				delete window[ uniqueName ];
			} catch (e) {}
			window[ uniqueName ] = null;
		};

		load(url + query + callbackParameterName + "=" + uniqueName);
		return uniqueName;
	}
	return {
		get:jsonp
	};
}());

    return JSONP.get;
});