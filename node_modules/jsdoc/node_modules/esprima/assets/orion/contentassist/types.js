/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 ******************************************************************************/

/*
This module defines the built in types for the scripted JS inferencer.
It also contains functions for manipulating internal type signatures.

Here is the BNF for internal type signature:

<type> ::= <simple_type> | <array_type> | <function_type> | <constructor_type> | <proto_type>

<simple_type> ::= js_identifier  // simple types are just js identifiers

<array_type> ::= "Array.[" <type> "]"  // a bit verbose for array types, but following syntax of closure compiler

<proto_type> ::= <type> "~proto"  // specifies that this type is a prototype of the base type

<function_type> ::= "?" <type> ":" (<parameter_type> ",")*  // function types have one or more paramteters

<constructor_type> ::= "*" <type> ":" (<parameter_type> ",")*  // same as function type, but with different start

<parameter_type> ::= js_identifier ("/" <type>)?  // a parameter type consists of a name and an optional type, separated by a /
*/


/*global define doctrine */
define("plugins/esprima/types", ["plugins/esprima/proposalUtils"], function(proposalUtils, scriptedLogger) {

	/**
	 * The Definition class refers to the declaration of an identifier.
	 * The start and end are locations in the source code.
	 * Path is a URL corresponding to the document where the definition occurs.
	 * If range is undefined, then the definition refers to the entire document
	 * Range is a two element array with the start and end values
	 * (Exactly the same range field as is used in Esprima)
	 * If the document is undefined, then the definition is in the current document.
	 *
	 * @param String typeName
	 * @param {Array.<Number>} range
	 * @param String path
	 */
	var Definition = function(typeName, range, path) {
		this.typeName = typeName;
		this.range = range;
		this.path = path;
	};

	// From ecma script manual 262 section 15
	// the global object when not in browser or node
	var Global = function() {};
	Global.prototype = {
		$$proto : new Definition("Object"),

		decodeURI : new Definition("?String:uri"),
		encodeURI : new Definition("?String:uri"),
		'eval' : new Definition("?Object:toEval"),
		parseInt : new Definition("?Number:str,[radix]"),
		parseFloat : new Definition("?Number:str,[radix]"),
		"this": new Definition("Global"),
		Math: new Definition("Math"),
		JSON: new Definition("JSON"),
		Object: new Definition("*Object:[val]"),
		Function: new Definition("*Function:"),
		Array: new Definition("*Array:[val]"),
		Boolean: new Definition("*Boolean:[val]"),
		Number: new Definition("*Number:[val]"),
		Date: new Definition("*Date:[val]"),
		RegExp: new Definition("*RegExp:[val]"),
		Error: new Definition("*Error:[err]"),
		'undefined' : new Definition("undefined"),
		isNaN : new Definition("?Boolean:num"),
		isFinite : new Definition("?Boolean:num"),
		"NaN" : new Definition("Number"),
		"Infinity" : new Definition("Number"),
		decodeURIComponent : new Definition("?String:encodedURIString"),
		encodeURIComponent : new Definition("?String:decodedURIString")

		// not included since not meant to be referenced directly
		// EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError
	};

	// Node module
	var Module = function() {};
	Module.prototype = {

		// From Window
		decodeURI : new Definition("?String:uri"),
		encodeURI : new Definition("?String:uri"),
		'eval' : new Definition("?Object:toEval"),
		parseInt : new Definition("?Number:str,[radix]"),
		parseFloat : new Definition("?Number:str,[radix]"),
		"this": new Definition("Module"),
		Math: new Definition("Math"),
		JSON: new Definition("JSON"),
		Object: new Definition("*Object:[val]"),
		Function: new Definition("*Function:"),
		Array: new Definition("*Array:[val]"),
		Boolean: new Definition("*Boolean:[val]"),
		Number: new Definition("*Number:[val]"),
		Date: new Definition("*Date:[val]"),
		RegExp: new Definition("*RegExp:[val]"),
		Error: new Definition("*Error:[err]"),
		'undefined' : new Definition("undefined"),
		isNaN : new Definition("?Boolean:num"),
		isFinite : new Definition("?Boolean:num"),
		"NaN" : new Definition("Number"),
		"Infinity" : new Definition("Number"),
		decodeURIComponent : new Definition("?String:encodedURIString"),
		encodeURIComponent : new Definition("?String:decodedURIString"),


		Buffer: new Definition("Object"),
		console: new Definition("Object"),
		module: new Definition("Module"),
		process: new Definition("Process"),

		require: new Definition("?Object:module"),
//		exports: new Definition("Object"),
		clearInterval: new Definition("?undefined:t"),
		clearTimeout: new Definition("?undefined:t"),
		setInterval: new Definition("?Number:callback,ms"),
		setTimeout : new Definition("?Number:callback,ms"),
		global: new Definition("Module"),
		querystring: new Definition("String"),
		__filename: new Definition("String"),
		__dirname: new Definition("String")
	};

	var Window = function() {};
	Window.prototype = {
		// copied from Global
		$$proto : new Definition("Object"),

		decodeURI : new Definition("?String:uri"),
		encodeURI : new Definition("?String:uri"),
		'eval' : new Definition("?Object:toEval"),
		parseInt : new Definition("?Number:str,[radix]"),
		parseFloat : new Definition("?Number:str,[radix]"),
		"this": new Definition("Window"),
		Math: new Definition("Math"),
		JSON: new Definition("JSON"),
		Object: new Definition("*Object:[val]"),
		Function: new Definition("*Function:"),
		Array: new Definition("*Array:[val]"),
		Boolean: new Definition("*Boolean:[val]"),
		Number: new Definition("*Number:[val]"),
		Date: new Definition("*Date:[val]"),
		RegExp: new Definition("*RegExp:[val]"),
		Error: new Definition("*Error:[err]"),
		'undefined' : new Definition("undefined"),
		isNaN : new Definition("?Boolean:num"),
		isFinite : new Definition("?Boolean:num"),
		"NaN" : new Definition("Number"),
		"Infinity" : new Definition("Number"),
		decodeURIComponent : new Definition("?String:encodedURIString"),
		encodeURIComponent : new Definition("?String:decodedURIString"),

		// see https://developer.mozilla.org/en/DOM/window
			// Properties
		applicationCache : new Definition("DOMApplicationCache"),
		closed : new Definition("Boolean"),
		console : new Definition("Console"),
		defaultStatus : new Definition("String"),
		document : new Definition("Document"),
		frameElement : new Definition("Element"),
		frames : new Definition("Array"),
		history : new Definition("History"),
		innerHeight : new Definition("Number"),
		innerWidth : new Definition("Number"),
		length : new Definition("Number"),
		location : new Definition("Location"),
		locationbar : new Definition("BarInfo"),
		localStorage : new Definition("Storage"),
		menubar : new Definition("BarInfo"),
		name : new Definition("String"),
		navigator : new Definition("Navigator"),
		opener : new Definition("Window"),
		outerHeight : new Definition("Number"),
		outerWidth : new Definition("Number"),
		pageXOffset : new Definition("Number"),
		pageYOffset : new Definition("Number"),
		parent : new Definition("Window"),
		performance : new Definition("Performance"),
		personalbar : new Definition("BarInfo"),
		screen : new Definition("Screen"),
		screenX : new Definition("Number"),
		screenY : new Definition("Number"),
		scrollbars : new Definition("BarInfo"),
		scrollMaxX : new Definition("Number"),
		scrollMaxY : new Definition("Number"),
		scrollX : new Definition("Number"),
		scrollY : new Definition("Number"),
		self : new Definition("Window"),
		sessionStorage : new Definition("Storage"),
		sidebar : new Definition("BarInfo"),
		status : new Definition("String"),
		statusbar : new Definition("BarInfo"),
		toolbar : new Definition("BarInfo"),
		top : new Definition("Window"),
		window : new Definition("Window"),

			// Methods
			// commented methods are mozilla-specific
		addEventListener : new Definition("?undefined:"),
		alert : new Definition("?undefined:String"),
		atob : new Definition("?String:val"),
		back : new Definition("?undefined:"),
		blur : new Definition("?undefined:"),
		btoa : new Definition("?String:val"),
		clearInterval : new Definition("?undefined:interval"),
		clearTimeout : new Definition("?undefined:timeout"),
		close : new Definition("?undefined:"),
		confirm : new Definition("?Boolean:msg"),
		//disableExternalCapture : new Definition("???"),
		dispatchEvent : new Definition("?undefined:domnode"),
		dump : new Definition("?undefined:message"),
		//enableExternalCapture : new Definition("???"),
		escape : new Definition("?String:str"),
		find : new Definition("?Boolean:text"),
		focus : new Definition("?undefined:"),
		forward : new Definition("?undefined:"),
		getAttention : new Definition("?undefined:"),
		getComputedStyle : new Definition("?CSSStyleDeclaration:dombode"),
		getSelection : new Definition("?Selection:"),
		home : new Definition("?undefined:"),
		matchMedia : new Definition("?MediaQueryList:query"),
		//maximize : new Definition("???"),
		//minimize : new Definition("???"),
		moveBy : new Definition("?undefined:deltaX,deltaY"),
		moveTo : new Definition("?undefined:x,y"),
		open : new Definition("?Window:strUrl,strWindowName,[strWindowFeatures]"),
		openDialog : new Definition("?Window:strUrl,strWindowName,strWindowFeatures,[args]"),
		postMessage : new Definition("?undefined:message,targetOrigin"),
		print : new Definition("?undefined:"),
		prompt : new Definition("?String:message"),
		removeEventListener : new Definition("?undefined:type,listener,[useCapture]"),
		resizeBy : new Definition("?undefined:deltaX,deltaY"),
		resizeTo : new Definition("?undefined:x,y"),
		scroll : new Definition("?undefined:x,y"),
		scrollBy : new Definition("?undefined:deltaX,deltaY"),
		scrollByLines : new Definition("?undefined:lines"),
		scrollByPages : new Definition("?undefined:pages"),
		scrollTo : new Definition("?undefined:x,y"),
		setCursor : new Definition("?undefined:cursor"),
		setInterval : new Definition("?Number:func,interval"),
		//setResizable : new Definition("???"),
		setTimeout : new Definition("?Number:func,timeout"),
		sizeToContent : new Definition("?undefined:"),
		stop : new Definition("?undefined:"),
		unescape : new Definition("?String:str"),
		updateCommands : new Definition("?undefined:cmdName"),

			// Events
		onabort : new Definition("?undefined:event"),
		onbeforeunload : new Definition("?undefined:event"),
		onblur : new Definition("?undefined:event"),
		onchange : new Definition("?undefined:event"),
		onclick : new Definition("?undefined:event"),
		onclose : new Definition("?undefined:event"),
		oncontextmenu : new Definition("?undefined:event"),
		ondevicemotion : new Definition("?undefined:event"),
		ondeviceorientation : new Definition("?undefined:event"),
		ondragdrop : new Definition("?undefined:event"),
		onerror : new Definition("?undefined:event"),
		onfocus : new Definition("?undefined:event"),
		onhashchange : new Definition("?undefined:event"),
		onkeydown : new Definition("?undefined:event"),
		onkeypress : new Definition("?undefined:event"),
		onkeyup : new Definition("?undefined:event"),
		onload : new Definition("?undefined:event"),
		onmousedown : new Definition("?undefined:event"),
		onmousemove : new Definition("?undefined:event"),
		onmouseout : new Definition("?undefined:event"),
		onmouseover : new Definition("?undefined:event"),
		onmouseup : new Definition("?undefined:event"),
		onpaint : new Definition("?undefined:event"),
		onpopstate : new Definition("?undefined:event"),
		onreset : new Definition("?undefined:event"),
		onresize : new Definition("?undefined:event"),
		onscroll : new Definition("?undefined:event"),
		onselect : new Definition("?undefined:event"),
		onsubmit : new Definition("?undefined:event"),
		onunload : new Definition("?undefined:event"),
		onpageshow : new Definition("?undefined:event"),
		onpagehide : new Definition("?undefined:event"),

			// Constructors
		Image : new Definition("*HTMLImageElement:[width],[height]"),
		Option : new Definition("*HTMLOptionElement:[text].[value],[defaultSelected],[selected]"),
		Worker : new Definition("*Worker:url"),
		XMLHttpRequest : new Definition("*XMLHttpRequest:"),
		WebSocket : new Definition("*WebSocket:url,protocols"),
		Event : new Definition("*Event:type"),
		Node : new Definition("*Node:")
	};

	var initialGlobalProperties = [];
	for (var prop in Global) {
		if (Global.hasOwnProperty(prop)) {
			initialGlobalProperties.push(prop);
		}
	}

	for (prop in Window) {
		if (Window.hasOwnProperty(prop)) {
			initialGlobalProperties.push(prop);
		}
	}

	/**
	 * A prototype that contains the common built-in types
	 */
	var Types = function(globalObjName) {

		// this object can be touched by clients
		// and so must not be in the prototype
		// the global 'this'
		if (globalObjName === 'Window') {
			this.Window = new Window();
		} else if (globalObjName === 'Module') {
			this.Module = new Module();
		} else {
			this.Global = new Global();
		}

		// TODO FIXADE should be declared on prototype
		this.clearDefaultGlobal = function() {
			for (var i = 0; i < initialGlobalProperties.length; i++) {
				if (this.Global[initialGlobalProperties[i]]) {
					delete this.Global[initialGlobalProperties[i]];
				}
			}
		};

	};


	/**
	 * Populate the Types object with built-in types.  These are not meant to be changed through the inferencing process
	 * This uses the built in types as defined in the ECMA script reference manual 262.  Available at
	 * http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf section 15.
	 */
	Types.prototype = {

		/**
		 * See 15.2.4 Properties of the Object Prototype Object
		 */
		Object : {
			$$isBuiltin: true,
			// Can't use the real propoerty name here because would override the real methods of that name
			$_$prototype : new Definition("Object"),
			$_$toString: new Definition("?String:"),
			$_$toLocaleString : new Definition("?String:"),
			$_$valueOf: new Definition("?Object:"),
			$_$hasOwnProperty: new Definition("?Boolean:property"),
			$_$isPrototypeOf: new Definition("?Boolean:object"),
			$_$propertyIsEnumerable: new Definition("?Boolean:property")
		},

		/**
		 * See 15.3.4 Properties of the Function Prototype Object
		 */
		Function : {
			$$isBuiltin: true,
			apply : new Definition("?Object:func,[argArray]"),
			"arguments" : new Definition("Arguments"),
			bind : new Definition("?Object:func,[args...]"),
			call : new Definition("?Object:func,[args...]"),
			caller : new Definition("Function"),
			length : new Definition("Number"),
			name : new Definition("String"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.4.4 Properties of the Array Prototype Object
		 */
		Array : {
			$$isBuiltin: true,

			concat : new Definition("?Array:first,[rest...]"),
			join : new Definition("?String:separator"),
			length : new Definition("Number"),
			pop : new Definition("?Object:"),
			push : new Definition("?Object:[vals...]"),
			reverse : new Definition("?Array:"),
			shift : new Definition("?Object:"),
			slice : new Definition("?Array:start,deleteCount,[items...]"),
			splice : new Definition("?Array:start,end"),
			sort : new Definition("?Array:[sorter]"),
			unshift : new Definition("?Number:[items...]"),
			indexOf : new Definition("?Number:searchElement,[fromIndex]"),
			lastIndexOf : new Definition("?Number:searchElement,[fromIndex]"),
			every : new Definition("?Boolean:callbackFn,[thisArg]"),
			some : new Definition("?Boolean:callbackFn,[thisArg]"),
			forEach : new Definition("?Object:callbackFn,[thisArg]"),  // should return
			map : new Definition("?Array:callbackFn,[thisArg]"),
			filter : new Definition("?Array:callbackFn,[thisArg]"),
			reduce : new Definition("?Array:callbackFn,[initialValue]"),
			reduceRight : new Definition("?Array:callbackFn,[initialValue]"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.5.4 Properties of the String Prototype Object
		 */
		String : {
			$$isBuiltin: true,
			charAt : new Definition("?String:index"),
			charCodeAt : new Definition("?Number:index"),
			concat : new Definition("?String:array"),
			indexOf : new Definition("?Number:searchString,[start]"),
			lastIndexOf : new Definition("?Number:searchString,[start]"),
			length : new Definition("Number"),
			localeCompare : new Definition("?Number:Object"),
			match : new Definition("?Boolean:regexp"),
			replace : new Definition("?String:searchValue,replaceValue"),
			search : new Definition("?String:regexp"),
			slice : new Definition("?String:start,end"),
			split : new Definition("?Array:separator,[limit]"),  // Array of string
			substring : new Definition("?String:start,end"),
			toLocaleUpperCase : new Definition("?String:"),
			toLowerCase : new Definition("?String:"),
			toLocaleLowerCase : new Definition("?String:"),
			toUpperCase : new Definition("?String:"),
			trim : new Definition("?String:"),

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.6.4 Properties of the Boolean Prototype Object
		 */
		Boolean : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		/**
		 * See 15.7.4 Properties of the Number Prototype Object
		 */
		Number : {
			$$isBuiltin: true,
			toExponential : new Definition("?Number:digits"),
			toFixed : new Definition("?Number:digits"),
			toPrecision : new Definition("?Number:digits"),
			// do we want to include NaN, MAX_VALUE, etc?

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.8.1 15.8.2 Properties and functions of the Math Object
		 * Note that this object is not used as a prototype to define other objects
		 */
		Math : {
			$$isBuiltin: true,

			// properties
			E : new Definition("Number"),
			LN2 : new Definition("Number"),
			LN10 : new Definition("Number"),
			LOG2E : new Definition("Number"),
			LOG10E : new Definition("Number"),
			PI : new Definition("Number"),
			SQRT1_2 : new Definition("Number"),
			SQRT2 : new Definition("Number"),

			// Methods
			abs : new Definition("?Number:val"),
			acos : new Definition("?Number:val"),
			asin : new Definition("?Number:val"),
			atan : new Definition("?Number:val"),
			atan2 : new Definition("?Number:val1,val2"),
			ceil : new Definition("?Number:val"),
			cos : new Definition("?Number:val"),
			exp : new Definition("?Number:val"),
			floor : new Definition("?Number:val"),
			log : new Definition("?Number:val"),
			max : new Definition("?Number:val1,val2"),
			min : new Definition("?Number:val1,val2"),
			pow : new Definition("?Number:x,y"),
			random : new Definition("?Number:"),
			round : new Definition("?Number:val"),
			sin : new Definition("?Number:val"),
			sqrt : new Definition("?Number:val"),
			tan : new Definition("?Number:val"),
			$$proto : new Definition("Object")
		},


		/**
		 * See 15.9.5 Properties of the Date Prototype Object
		 */
		Date : {
			$$isBuiltin: true,
			toDateString : new Definition("?String:"),
			toTimeString : new Definition("?String:"),
			toUTCString : new Definition("?String:"),
			toISOString : new Definition("?String:"),
			toJSON : new Definition("?Object:key"),
			toLocaleDateString : new Definition("?String:"),
			toLocaleTimeString : new Definition("?String:"),

			getTime : new Definition("?Number:"),
			getTimezoneOffset : new Definition("?Number:"),

			getDay : new Definition("?Number:"),
			getUTCDay : new Definition("?Number:"),
			getFullYear : new Definition("?Number:"),
			getUTCFullYear : new Definition("?Number:"),
			getHours : new Definition("?Number:"),
			getUTCHours : new Definition("?Number:"),
			getMinutes : new Definition("?Number:"),
			getUTCMinutes : new Definition("?Number:"),
			getSeconds : new Definition("?Number:"),
			getUTCSeconds : new Definition("?Number:"),
			getMilliseconds : new Definition("?Number:"),
			getUTCMilliseconds : new Definition("?Number:"),
			getMonth : new Definition("?Number:"),
			getUTCMonth : new Definition("?Number:"),
			getDate : new Definition("?Number:"),
			getUTCDate : new Definition("?Number:"),

			setTime : new Definition("?Number:"),
			setTimezoneOffset : new Definition("?Number:"),

			setDay : new Definition("?Number:dayOfWeek"),
			setUTCDay : new Definition("?Number:dayOfWeek"),
			setFullYear : new Definition("?Number:year,[month],[date]"),
			setUTCFullYear : new Definition("?Number:year,[month],[date]"),
			setHours : new Definition("?Number:hour,[min],[sec],[ms]"),
			setUTCHours : new Definition("?Number:hour,[min],[sec],[ms]"),
			setMinutes : new Definition("?Number:min,[sec],[ms]"),
			setUTCMinutes : new Definition("?Number:min,[sec],[ms]"),
			setSeconds : new Definition("?Number:sec,[ms]"),
			setUTCSeconds : new Definition("?Number:sec,[ms]"),
			setMilliseconds : new Definition("?Number:ms"),
			setUTCMilliseconds : new Definition("?Number:ms"),
			setMonth : new Definition("?Number:month,[date]"),
			setUTCMonth : new Definition("?Number:month,[date]"),
			setDate : new Definition("?Number:date"),
			setUTCDate : new Definition("?Number:gate"),

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.10.6 Properties of the RexExp Prototype Object
		 */
		RegExp : {
			$$isBuiltin: true,
//			g : new Definition("Object"),
//			i : new Definition("Object"),
//			gi : new Definition("Object"),
//			m : new Definition("Object"),
			source : new Definition("String"),
			global : new Definition("Boolean"),
			ignoreCase : new Definition("Boolean"),
			multiline : new Definition("Boolean"),
			lastIndex : new Definition("Boolean"),

			exec : new Definition("?Array:str"),
			test : new Definition("?Boolean:str"),

			$$proto : new Definition("Object")
		},

		"?RegExp:" : {
			$$isBuiltin: true,
			$$proto : new Definition("Function"),

			$1 : new Definition("String"),
			$2 : new Definition("String"),
			$3 : new Definition("String"),
			$4 : new Definition("String"),
			$5 : new Definition("String"),
			$6 : new Definition("String"),
			$7 : new Definition("String"),
			$8 : new Definition("String"),
			$9 : new Definition("String"),
			$_ : new Definition("String"),
			$input : new Definition("String"),
			input : new Definition("String"),
			name : new Definition("String")
		},


		/**
		 * See 15.11.4 Properties of the Error Prototype Object
		 * We don't distinguish between kinds of errors
		 */
		Error : {
			$$isBuiltin: true,
			name : new Definition("String"),
			message : new Definition("String"),
			stack : new Definition("String"),
			$$proto : new Definition("Object")
		},

		/**
		 * See 10.6 Arguments Object
		 */
		Arguments : {
			$$isBuiltin: true,
			callee : new Definition("Function"),
			length : new Definition("Number"),

			$$proto : new Definition("Object")
		},

		/**
		 * See 15.12.2 and 15.12.3 Properties of the JSON Object
		 */
		JSON : {
			$$isBuiltin: true,

			parse : new Definition("?Object:str"),
			stringify : new Definition("?String:obj"),
			$$proto : new Definition("Object")
		},

		"undefined" : {
			$$isBuiltin: true
		},


		///////////////////////////////////////////////////
		// Node specific types
		///////////////////////////////////////////////////
		// See http://nodejs.org/api/process.html
		Process : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			on: new Definition("?undefined:kind,callback"),

			abort: new Definition("?undefined:"),
			stdout: new Definition("Stream"),
			stderr: new Definition("Stream"),
			stdin: new Definition("Stream"),
			argv: new Definition("Array"), // Array.<String>
			execPath: new Definition("String"),
			chdir: new Definition("?undefined:directory"),
			cwd: new Definition("?String:"),
			env: new Definition("Object"),
			getgid: new Definition("?Number:"),
			setgid: new Definition("?undefined:id"),
			getuid: new Definition("?Number:"),
			setuid: new Definition("?undefined:id"),
			version: new Definition("String"),
			versions: new Definition("Object"), // TODO create a versions object?
			config: new Definition("Object"),
			kill: new Definition("?undefined:pid,[signal]"),
			pid: new Definition("Number"),
			title: new Definition("String"),
			arch: new Definition("String"),
			platform: new Definition("String"),
			memoryUsage: new Definition("?Object:"),
			nextTick: new Definition("?undefined:callback"),
			umask: new Definition("?undefined:[mask]"),
			uptime: new Definition("?Number:"),
			hrtime: new Definition("?Array:") // Array.<Number>
		},

		// See http://nodejs.org/api/stream.html
		// Stream is a wierd one since it is built into the stream module,
		// but this module isn't always around, so must explicitly define it.
		Stream : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),
			// combines readable and writable streams

			// readable

			// events
			data: new Definition("?undefined:data"),
			error: new Definition("?undefined:exception"),
			close: new Definition("?undefined:"),

			readable: new Definition("Boolean"),

			setEncoding: new Definition("?undefined:[encoding]"),
			pause: new Definition("?undefined:"),
			resume: new Definition("?undefined:"),
			pipe: new Definition("?undefined:destingation,[options]"),

			// writable
			drain: new Definition("?undefined:"),

			writable: new Definition("Boolean"),

			write: new Definition("?undefined:[nuffer]"),
			end: new Definition("?undefined:[string],[encoding]"),
			destroy: new Definition("?undefined:"),
			destroySoon: new Definition("?undefined:")
		},

		///////////////////////////////////////////////////
		// Browser specific types
		///////////////////////////////////////////////////

		// https://developer.mozilla.org/en/DOM/window.screen
		Screen : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			availTop : new Definition("Number"),
			availLeft : new Definition("Number"),
			availHeight : new Definition("Number"),
			availWidth : new Definition("Number"),
			colorDepth : new Definition("Number"),
			height : new Definition("Number"),
			left : new Definition("Number"),
			pixelDepth : new Definition("Number"),
			top : new Definition("Number"),
			width : new Definition("Number")
		},


		// https://developer.mozilla.org/en-US/docs/DOM/window.locationbar
		BarInfo : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			visible : new Definition("Boolean")
		},

		// http://w3c-test.org/webperf/specs/NavigationTiming/
		// incomplete
		Performance : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// https://developer.mozilla.org/en/DOM/window.navigator
		Navigator : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			// properties
			appName : new Definition("String"),
			appVersion : new Definition("String"),
			connection : new Definition("Connection"),
			cookieEnabled : new Definition("Boolean"),
			language : new Definition("String"),
			mimeTypes : new Definition("MimeTypeArray"),
			onLine : new Definition("Boolean"),
			oscpu : new Definition("String"),
			platform : new Definition("String"),
			plugins : new Definition("String"),
			userAgent : new Definition("String"),

			// methods
			javaEnabled : new Definition("?Boolean:"),
			registerContentHandler : new Definition("?undefined:mimType,url,title"),
			registerProtocolHandler : new Definition("?undefined:protocol,url,title")
		},

		// (not in MDN) http://www.coursevector.com/dommanual/dom/objects/MimeTypeArray.html
		MimeTypeArray : {
			$$isBuiltin: true,
			length : new Definition("Number"),
			item : new Definition("?MimeType:index"),
			namedItem : new Definition("?MimeType:name")
		},

		// (not in MDN) http://www.coursevector.com/dommanual/dom/objects/MimeType.html
		MimeType : {
			$$isBuiltin: true,
			description : new Definition("String"),
			suffixes : new Definition("String"),
			type : new Definition("String"),
			enabledPlugin : new Definition("Plugin")
		},

		// (not in MDN) http://www.coursevector.com/dommanual/dom/objects/Plugin.html
		Plugin : {
			$$isBuiltin: true,
			description : new Definition("String"),
			fileName : new Definition("String"),
			length : new Definition("Number"),
			name : new Definition("String"),
			item : new Definition("?MimeType:index"),
			namedItem : new Definition("?MimeType:name")
		},

		// http://dvcs.w3.org/hg/dap/raw-file/tip/network-api/Overview.html#the-connection-interface
		Connection : {
			$$isBuiltin: true,
			bandwidth : new Definition("Number"),
			metered : new Definition("Boolean"),

			onchange : new Definition("Function")
		},

		// http://dev.w3.org/html5/webstorage/#storage-0
		Storage : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			length : new Definition("Number"),

			key : new Definition("?String:idx"),
			getItem : new Definition("?String:key"),
			setItem : new Definition("?undefined:key,value"),
			removeItem : new Definition("?undefined:key"),
			clear : new Definition("?undefined:")
		},

		// http://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#interface-xmlhttprequest
		XMLHttpRequest : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			onreadystatechange : new Definition("EventHandler"),

			// request
			open : new Definition("?undefined:method,url,[async],[user],[password]"),
			setRequestHeader : new Definition("?undefined:header,value"),
			timeout : new Definition("Number"),
			withCredentials : new Definition("Boolean"),
			upload : new Definition("Object"), // not right
			send : new Definition("?undefined:[data]"),
			abort : new Definition("?undefined:"),

			// response
			getResponseHeader : new Definition("?String:header"),
			getAllResponseHeaders : new Definition("?String:"),
			overrideMimType : new Definition("Object"),
			responseType : new Definition("Object"),  // not right
			readyState : new Definition("Number"),
			response : new Definition("Object"),
			responseText : new Definition("String"),
			responseXML : new Definition("Document"),
			status : new Definition("Number"),
			statusText : new Definition("String")
		},

		// http://www.w3.org/TR/workers/
		Worker : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			terminate : new Definition("?undefined:"),
			postMessage : new Definition("?undefined:message,[transfer]"),
			onmessage : new Definition("?undefined:")
		},

		// http://www.w3.org/TR/workers/#messageport
		MessagePort : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// http://www.whatwg.org/specs/web-apps/current-work/multipage//network.html#websocket
		WebSocket : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			onreadystatechange : new Definition("EventHandler"),
			onopen : new Definition("EventHandler"),
			onerror : new Definition("EventHandler"),
			onclose : new Definition("EventHandler"),

			readyState : new Definition("Number"),
			extensions : new Definition("String"),
			protocol : new Definition("String"),

			close : new Definition("?undefined:[reason]"),
			send :  new Definition("?undefined:data")
		},

		// https://developer.mozilla.org/en/DOM/Console
		Console : {
			$$isBuiltin: true,
			debug : new Definition("?undefined:msg"),
			dir : new Definition("?undefined:obj"),
			error : new Definition("?undefined:msg"),
			group : new Definition("?undefined:"),
			groupCollapsed : new Definition("?undefined:"),
			groupEnd : new Definition("?undefined:"),
			info : new Definition("?undefined:msg"),
			log : new Definition("?undefined:msg"),
			time : new Definition("?undefined:timerName"),
			timeEnd : new Definition("?undefined:timerName"),
			trace : new Definition("?undefined:"),
			warn : new Definition("?undefined:msg")
		},

		// TODO FIXADE remove ???
		// http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#eventhandler
		EventHandler : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// https://developer.mozilla.org/en/DOM/Event
		Event : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			// properties
			bubbles : new Definition("Boolean"),
			cancelable : new Definition("Boolean"),
			currentTarget : new Definition("Object"),
			defaultPrevented : new Definition("Boolean"),
			eventPhase : new Definition("Number"),  // Add constants
			explicitOriginalTarget : new Definition("Object"),
			originalTarget : new Definition("Object"),
			target : new Definition("Object"),
			timeStamp : new Definition("Number"),
			isTrusted : new Definition("Boolean"),

			// methods
			initEvent : new Definition("?undefined:type,bubbles,cancelable"),
			preventDefault : new Definition("?undefined:"),
			stopImmediatePropagation : new Definition("?undefined:"),
			stopPropagation : new Definition("?undefined:")
		},

		"?Event:" : {
			$$isBuiltin: true,
			$$proto : new Definition("Function"),

			CAPTURING_PHASE : new Definition("Number"),
			AT_TARGET : new Definition("Number"),
			BUBBLING_PHASE : new Definition("Number")
		},

		// see http://www.w3.org/TR/dom/#documenttype
		DocumentType : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			name : new Definition("String"),
			publicId : new Definition("String"),
			systemId : new Definition("String"),

			before : new Definition("?undefined:nodeOrString"),
			after : new Definition("?undefined:nodeOrString"),
			replace : new Definition("?undefined:nodeOrString"),
			remove : new Definition("?undefined:")
		},

		// see http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#the-history-interface
		History : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			length : new Definition("Number"),
			state : new Definition("Object"),

			go : new Definition("?undefined:delta"),
			back : new Definition("?undefined:"),
			forward : new Definition("?undefined:"),
			pushState : new Definition("?undefined:data,title,url"),
			replaceState : new Definition("?undefined:data,title,url")
		},

		// see http://www.w3.org/TR/dom/#document (complete)
		// see http://www.w3.org/TR/html5/dom.html#documents-in-the-dom (incomplete)
		Document : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			implementation : new Definition("DOMImplementation"),
			URL : new Definition("String"),
			documentURI : new Definition("String"),
			compatMode : new Definition("String"),
			characterSet : new Definition("String"),
			contentType : new Definition("String"),

			doctype : new Definition("DocumentType"),
			documentElement : new Definition("Element"),

			getElementsByTagName : new Definition("?HTMLCollection:localName"),
			getElementsByTagNameNS : new Definition("?HTMLCollection:namespace,localName"),
			getElementsByClassName : new Definition("?HTMLCollection:classNames"),
			getElementById : new Definition("?Element:elementId"),
			createElement : new Definition("?Element:elementId"),
			createElementNS : new Definition("?Element:namespace,qualifiedName"),
			createDocumentFragment : new Definition("?DocumentFragment:"),
			createTextNode : new Definition("?Text:data"),
			createComment : new Definition("?Comment:data"),
			createProcessingInstruction : new Definition("?ProcessingInstruction:target,data"),
			importNode : new Definition("?Node:node,[deep]"),
			adoptNode : new Definition("?Node:node"),
			createEvent : new Definition("?Event:eventInterfaceName"),
			createRange : new Definition("?Range:"),

			createNodeIterator : new Definition("?NodeIterator:root,[whatToShow],[filter]"),
			createTreeWalker : new Definition("?TreeWalker:root,[whatToShow],[filter]"),

			prepend : new Definition("?undefined:[nodes]"),
			append : new Definition("?undefined:[nodes]")
		},

		// see http://www.w3.org/TR/dom/#domimplementation
		DOMImplementation : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			createDocumentType : new Definition("?DocumentType:qualifiedName,publicId,systemId"),
			createDocument : new Definition("?Document:namespace,qualifiedName,doctype"),
			createHTMLDocument : new Definition("?Document:title"),
			hasFeature : new Definition("?Boolean:feature")
		},

		// see http://www.w3.org/TR/dom/#node
		Node : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			nodeType : new Definition("Number"),
			nodeName : new Definition("String"),
			baseURI : new Definition("String"),
			ownerDocument : new Definition("Document"),
			parentNode : new Definition("Node"),
			parentElement : new Definition("Element"),
			childNodes : new Definition("NodeList"),
			firstChild : new Definition("Node"),
			lastChild : new Definition("Node"),
			previousSibling : new Definition("Node"),
			nextSibling : new Definition("Node"),
			nodeValue : new Definition("String"),
			textContent : new Definition("String"),

			hasChildNodes : new Definition("?Boolean:"),
			compareDocumentPosition : new Definition("?Number:other"),
			contains : new Definition("?Boolean:other"),
			insertBefore : new Definition("?Node:node,child"),
			appendChild : new Definition("?Node:node"),
			replaceChild : new Definition("?Node:node,child"),
			removeChild : new Definition("?Node:node,child"),
			normalize : new Definition("?undefined:"),
			cloneNode : new Definition("?Node:[deep]"),
			isEqualNode : new Definition("?Boolean:node"),
			lookupPrefix : new Definition("?String:namespace"),
			lookupNamespaceURI : new Definition("?String:prefix"),
			isDefaultNamespace : new Definition("?Boolean:namespace")
		},

		// Constants declared on Node
		"?Node:" : {
			$$isBuiltin: true,
			$$proto : new Definition("Function"),
			ELEMENT_NODE : new Definition("Number"),
			ATTRIBUTE_NODE : new Definition("Number"),
			TEXT_NODE : new Definition("Number"),
			CDATA_SECTION_NODE : new Definition("Number"),
			ENTITY_REFERENCE_NODE : new Definition("Number"),
			ENTITY_NODE : new Definition("Number"),
			PROCESSING_INSTRUCTION_NODE : new Definition("Number"),
			COMMENT_NODE : new Definition("Number"),
			DOCUMENT_NODE : new Definition("Number"),
			DOCUMENT_TYPE_NODE : new Definition("Number"),
			DOCUMENT_FRAGMENT_NODE : new Definition("Number"),
			NOTATION_NODE : new Definition("Number"),

			DOCUMENT_POSITION_DISCONNECTED : new Definition("Number"),
			DOCUMENT_POSITION_PRECEDING : new Definition("Number"),
			DOCUMENT_POSITION_FOLLOWING : new Definition("Number"),
			DOCUMENT_POSITION_CONTAINS : new Definition("Number"),
			DOCUMENT_POSITION_CONTAINED_BY : new Definition("Number"),
			DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : new Definition("Number")
		},

		// see http://www.w3.org/TR/dom/#element
		Element : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			namespaceURI : new Definition("String"),
			prefix : new Definition("String"),
			localName : new Definition("String"),
			tagName : new Definition("String"),

			id : new Definition("String"),
			className : new Definition("String"),

			classList : new Definition("DOMTokenList"),

			attributes : new Definition("Array"), // of attributes

			childElementCount : new Definition("Number"),

			children : new Definition("HTMLCollection"),
			firstElementChild : new Definition("Element"),
			lastElementChild : new Definition("Element"),
			previousElementSibling : new Definition("Element"),
			nextElementSibling : new Definition("Element"),

			getAttribute : new Definition("?String:name"),
			getAttributeNS : new Definition("?String:namespace,localname"),
			setAttribute : new Definition("?undefined:name,value"),
			setAttributeNS : new Definition("?undefined:namespace,name,value"),
			removeAttribute : new Definition("?undefined:name"),
			removeAttributeNS : new Definition("?undefined:namespace,localname"),
			hasAttribute : new Definition("?Boolean:name"),
			hasAttributeNS : new Definition("?Boolean:namespace,localname"),

			getElementsByTagName : new Definition("?HTMLCollection:localName"),
			getElementsByTagNameNS : new Definition("?HTMLCollection:namespace,localName"),
			getElementsByClassName : new Definition("?HTMLCollection:classname"),

			prepend : new Definition("?undefined:[nodes]"),
			append : new Definition("?undefined:[nodes]"),
			before : new Definition("?undefined:[nodes]"),
			after : new Definition("?undefined:[nodes]"),
			replace : new Definition("?undefined:[nodes]"),
			remove : new Definition("?undefined:")
		},

		// see http://www.w3.org/TR/dom/#attr
		Attr : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			isId : new Definition("Boolean"),
			name : new Definition("String"),
			value : new Definition("String"),
			namespaceURI : new Definition("String"),
			prefix : new Definition("String"),
			localName : new Definition("String")
		},

		// see http://www.w3.org/TR/dom/#interface-nodelist
		NodeList : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			item : new Definition("Node"),
			length : new Definition("Number")
		},

		// incomplete
		DOMApplicationCache : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// incomplete
		CSSStyleDeclaration : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},
		// incomplete
		MediaQueryList : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},
		// see http://www.whatwg.org/specs/web-apps/current-work/multipage/history.html#dom-location
		Location : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			assign : new Definition("?undefined:url"),
			replace : new Definition("?undefined:url"),
			reload : new Definition("?undefined:"),

			href : new Definition("String"),
			protocol : new Definition("String"),
			host : new Definition("String"),
			hostname : new Definition("String"),
			port : new Definition("String"),
			pathname : new Definition("String"),
			search : new Definition("String"),
			hash : new Definition("String")
		},

		// see http://dvcs.w3.org/hg/editing/raw-file/tip/editing.html#selections
		Selection : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			anchorNode : new Definition("Node"),
			anchorOffset : new Definition("Number"),
			focusNode : new Definition("Node"),
			focusOffset : new Definition("Number"),
			rangeCount : new Definition("Number"),

			isCollapsed : new Definition("Boolean"),


			collapse : new Definition("?undefined:node,offset"),
			collapseToStart : new Definition("?undefined:"),
			collapseToEnd : new Definition("?undefined:"),

			extend : new Definition("?undefined:node,offset"),

			selectAllChildren : new Definition("?undefined:node"),
			deleteFromDocument : new Definition("?undefined:"),
			getRangeAt : new Definition("?Range:index"),
			addRange : new Definition("?undefined:range"),
			removeRange : new Definition("?undefined:range"),
			removeAllRanges : new Definition("?undefined:")
		},

		// see http://www.w3.org/TR/html5/the-html-element.html#the-html-element
		// incomplete
		HTMLElement : {
			$$isBuiltin: true,
			$$proto : new Definition("Element"),

			id : new Definition("String"),
			title : new Definition("String"),
			lang : new Definition("String"),
			dir : new Definition("String"),
			className : new Definition("String")
		},

		// see http://www.w3.org/TR/html5/the-img-element.html#htmlimageelement
		// incomplete
		HTMLImageElement : {
			$$isBuiltin: true,
			$$proto : new Definition("HTMLElement")
		},

		// incomplete
		HTMLOptionElement : {
			$$isBuiltin: true,
			$$proto : new Definition("HTMLElement")
		},

		// http://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-75708506
		HTMLCollection : {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),
			length : new Definition("Number"),
			item : new Definition("?Element:index"),
			namedItem : new Definition("?Element:name")
		},

		// incomplete
		NodeIterator : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// incomplete
		TreeWalker : {
			$$isBuiltin: true,
			$$proto : new Definition("Object")
		},

		// http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-documentfragment
		DocumentFragment : {
			$$isBuiltin: true,
			$$proto : new Definition("Node"),

			prepend : new Definition("?undefined:[nodes]"),
			append : new Definition("?undefined:[nodes]")
		},

		// incomplete
		Text : {
			$$isBuiltin: true,
			$$proto : new Definition("Node")
		},

		// incomplete
		ProcessingInstruction : {
			$$isBuiltin: true,
			$$proto : new Definition("Node")
		},

		// incomplete
		Comment : {
			$$isBuiltin: true,
			$$proto : new Definition("Node")
		},

		// see http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#ranges
		Range: {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			startContainer : new Definition("Node"),
			startOffset : new Definition("Number"),
			endContainer : new Definition("Node"),
			endOffset : new Definition("Number"),
			collapsed : new Definition("Boolean"),
			commonAncestorContainer : new Definition("Node"),

			setStart : new Definition("?undefined:refNode,offset"),
			setEnd : new Definition("?undefined:refNode,offset"),
			setStartBefore : new Definition("?undefined:refNode"),
			setStartAfter : new Definition("?undefined:refNode"),
			setEndBefore : new Definition("?undefined:refNode"),
			setEndAfter : new Definition("?undefined:refNode"),
			collapse : new Definition("?undefined:toStart"),
			selectNode : new Definition("?undefined:refNode"),
			selectNodeContents : new Definition("?undefined:refNode"),

			compareBoundaryPoints : new Definition("?Number:how,sourceRange"),

			deleteContents : new Definition("?undefined:"),
			extractContents : new Definition("?DocumentFragment:"),
			cloneContents : new Definition("?DocumentFragment:"),
			insertNode : new Definition("?undefined:node"),
			surroundContents : new Definition("?undefined:nodeParent"),

			cloneRange : new Definition("?Range:"),
			detach : new Definition("?undefined:"),


			isPointInRange : new Definition("?Boolean:node,offset"),
			comparePoint : new Definition("?Number:node,offset"),

			intersectsNode : new Definition("?Boolean:node")
		},

		"?Range:" : {
			$$isBuiltin: true,
			START_TO_START : new Definition("Number"),
			START_TO_END : new Definition("Number"),
			END_TO_END : new Definition("Number"),
			END_TO_START : new Definition("Number")
		},


		// incomplete
		DOMTokenList: {
			$$isBuiltin: true,
			$$proto : new Definition("Object"),

			length : new Definition("Number"),

			item : new Definition("?String:index"),
			contains : new Definition("?Boolean:token"),
			add : new Definition("?undefined:token"),
			remove : new Definition("?undefined:token"),
			toggle : new Definition("?Boolean:token")
		}

// HTML constructors
// http://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-33759296
/*
HTMLVideoElement
HTMLAppletElement
HTMLCollection
HTMLOutputElement
HTMLQuoteElement
HTMLFrameElement
HTMLTableSectionElement
HTMLModElement
HTMLTableCaptionElement
HTMLCanvasElement
HTMLOptGroupElement
HTMLLinkElement
HTMLImageElement
HTMLBRElement
HTMLProgressElement
HTMLParagraphElement
HTMLScriptElement
HTMLOListElement
HTMLTableCellElement
HTMLTextAreaElement
HTMLUListElement
HTMLMarqueeElement
HTMLFieldSetElement
HTMLLIElement
HTMLTableElement
HTMLButtonElement
HTMLAnchorElement
HTMLAllCollection
HTMLMetaElement
HTMLLabelElement
HTMLMenuElement
HTMLMapElement
HTMLParamElement
HTMLTableColElement
HTMLTableRowElement
HTMLDocument
HTMLSpanElement
HTMLBaseFontElement
HTMLEmbedElement
HTMLDivElement
HTMLBaseElement
HTMLHeadElement
HTMLTitleElement
HTMLDirectoryElement
HTMLUnknownElement
HTMLHtmlElement
HTMLHRElement
HTMLInputElement
HTMLDataListElement
HTMLStyleElement
HTMLSourceElement
HTMLOptionElement
HTMLFontElement
HTMLElement
HTMLBodyElement
HTMLFormElement
HTMLHeadingElement
HTMLSelectElement
HTMLPreElement
HTMLIFrameElement
HTMLMediaElement
HTMLLegendElement
HTMLObjectElement
HTMLDListElement
HTMLAudioElement
HTMLAreaElement
HTMLFrameSetElement
HTMLMeterElement
HTMLKeygenElement
*/
// SVG constructors
// http://www.w3.org/TR/SVG11/struct.html#NewDocument
/*
SVGScriptElement
SVGCircleElement
SVGTitleElement
SVGFEDistantLightElement
SVGGElement
SVGAnimatedString
SVGFEConvolveMatrixElement
SVGTransform
SVGAltGlyphDefElement
SVGAnimatedLengthList
SVGCursorElement
SVGAnimateColorElement
SVGPathSegCurvetoQuadraticSmoothAbs
SVGDefsElement
SVGAnimateElement
SVGPathSegLinetoVerticalAbs
SVGAnimatedBoolean
SVGVKernElement
SVGElement
SVGEllipseElement
SVGForeignObjectElement
SVGColor
SVGFEPointLightElement
SVGMissingGlyphElement
SVGPathSegCurvetoCubicRel
SVGPathSegMovetoRel
SVGFEDisplacementMapElement
SVGPathSegArcRel
SVGAElement
SVGFETurbulenceElement
SVGMetadataElement
SVGTextElement
SVGElementInstanceList
SVGFEBlendElement
SVGTSpanElement
SVGFESpecularLightingElement
SVGPathSegArcAbs
SVGZoomEvent
SVGSVGElement
SVGPathSegLinetoHorizontalRel
SVGFEOffsetElement
SVGAltGlyphItemElement
SVGPaint
SVGException
SVGLengthList
SVGFontFaceUriElement
SVGPathSegLinetoAbs
SVGMarkerElement
SVGStyleElement
SVGAnimatedRect
SVGFilterElement
SVGFEFuncGElement
SVGAnimatedNumberList
SVGPathSegLinetoHorizontalAbs
SVGZoomAndPan
SVGFEImageElement
SVGAnimatedPreserveAspectRatio
SVGPathSegLinetoVerticalRel
SVGAltGlyphElement
SVGSetElement
SVGPathSegCurvetoCubicAbs
SVGRect
SVGPathSegClosePath
SVGFEGaussianBlurElement
SVGAngle
SVGViewElement
SVGMatrix
SVGPreserveAspectRatio
SVGTextPathElement
SVGRenderingIntent
SVGFEFloodElement
SVGAnimateTransformElement
SVGFEMergeNodeElement
SVGPoint
SVGTRefElement
SVGFESpotLightElement
SVGLinearGradientElement
SVGPathSegList
SVGTextContentElement
SVGPointList
SVGSwitchElement
SVGPathSegCurvetoQuadraticSmoothRel
SVGFontFaceElement
SVGLineElement
SVGLength
SVGFECompositeElement
SVGDocument
SVGGlyphElement
SVGFontFaceNameElement
SVGFEMergeElement
SVGPathSegCurvetoCubicSmoothRel
SVGAnimatedInteger
SVGAnimatedNumber
SVGAnimateMotionElement
SVGStopElement
SVGUseElement
SVGFontElement
SVGGradientElement
SVGPathSegLinetoRel
SVGPathSegCurvetoQuadraticAbs
SVGAnimatedEnumeration
SVGNumber
SVGTextPositioningElement
SVGComponentTransferFunctionElement
SVGFEDiffuseLightingElement
SVGStringList
SVGRadialGradientElement
SVGPathElement
SVGMaskElement
SVGFEFuncBElement
SVGPolygonElement
SVGGlyphRefElement
SVGFEColorMatrixElement
SVGElementInstance
SVGFontFaceSrcElement
SVGAnimatedAngle
SVGFontFaceFormatElement
SVGHKernElement
SVGPolylineElement
SVGAnimatedTransformList
SVGFEFuncRElement
SVGDescElement
SVGAnimatedLength
SVGSymbolElement
SVGNumberList
SVGViewSpec
SVGPathSegCurvetoCubicSmoothAbs
SVGMPathElement
SVGPatternElement
SVGPathSegCurvetoQuadraticRel
SVGFEComponentTransferElement
SVGRectElement
SVGTransformList
SVGFETileElement
SVGFEDropShadowElement
SVGUnitTypes
SVGPathSegMovetoAbs
SVGClipPathElement
SVGFEMorphologyElement
SVGImageElement
SVGPathSeg
SVGFEFuncAElement
*/
	};

	var protoLength = "~proto".length;
	return {
		Types : Types,
		Definition : Definition,

		// now some functions that handle types signatures, styling, and parsing

		/** constant that defines generated type name prefixes */
		GEN_NAME : "gen~",


		// type parsing
		isArrayType : function(typeName) {
			return typeName.substr(0, "Array.<".length) === "Array.<";
		},

		isFunctionOrConstructor : function(typeName) {
			return typeName.charAt(0) === "?" || typeName.charAt(0) === "*";
		},

		isPrototype : function(typeName) {
			return typeName.charAt(0) === "*" && typeName.substr( - protoLength, protoLength) === "~proto";
		},

		findReturnTypeEnd : function(fnType) {
			if (this.isFunctionOrConstructor(fnType)) {
				// walk the string and for every ? or *, find the corresponding :, until we reach the
				// : for the first ? or *
				var depth = 1;
				var index = 1;
				var len = fnType.length;

				while (index < len) {
					if (this.isFunctionOrConstructor(fnType.charAt(index))) {
						depth++;
					} else if (fnType.charAt(index) === ":") {
						depth--;
					}

					if (depth === 0) {
						// found it
						return index;
					}

					index++;
				}
			}
			return -1;
		},

		removeParameters : function(fnType) {
			var index = this.findReturnTypeEnd(fnType);
			if (index >= 0) {
				return fnType.substring(0,index+1);
			}
			// didn't find a matching ":" (ie- invalid type)
			// or just not a function type
			return fnType;
		},

		/**
		 * if the type passed in is a function type, extracts the return type
		 * otherwise returns as is
		 */
		extractReturnType : function(fnType) {
			var index = this.findReturnTypeEnd(fnType);
			if (index >= 0) {
				return fnType.substring(1,index);
			}
			// didn't find a matching ":" (ie- invalid type)
			// or just not a function type
			return fnType;
		},

		/**
		 * returns a parameterized array type with the given type parameter
		 */
		parameterizeArray : function(parameterType) {
			return "Array.<" + parameterType + ">";
		},

		/**
		 * If this is a parameterized array type, then extracts the type,
		 * Otherwise object
		 */
		extractArrayParameterType : function (arrayType) {
			if (arrayType.substr(0, "Array.<".length) === "Array.<" && arrayType.substr(-1, 1) === ">") {
				return arrayType.substring("Array.<".length, arrayType.length -1);
			} else {
				return "Object";
			}
		},

		parseJSDocComment : function(docComment) {
			var result = { };
			result.params = {};
			if (docComment) {
				var commentText = docComment.value;
				try {
					var rawresult = doctrine.parse("/*" + commentText + "*/", {unwrap : true, tags : ['param', 'type', 'return']});
					// transform result into something more manageable
					var rawtags = rawresult.tags;
					if (rawtags) {
						for (var i = 0; i < rawtags.length; i++) {
							switch (rawtags[i].title) {
								case "typedef":
								case "define":
								case "type":
									result.type = rawtags[i].type;
									break;
								case "return":
									result.rturn = rawtags[i].type;
									break;
								case "param":
									// remove square brackets
									var name = rawtags[i].name;
									if (name.charAt(0) === '[' && name.charAt(name.length -1) === ']') {
										name = name.substring(1, name.length-1);
									}
									result.params[name] = rawtags[i].type;
									break;
							}
						}
					}
				} catch (e) {
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
				}
			}
			return result;
		},

		/**
		 * Best effort to recursively convert from a jsdoc type specification to a scripted type name.
		 *
		 * See here: https://developers.google.com/closure/compiler/docs/js-for-compiler
		 * should handle:
				NullableLiteral
				AllLiteral
				NullLiteral
				UndefinedLiteral
				VoidLiteral
				UnionType
				ArrayType
				RecordType
				FieldType
				FunctionType
				ParameterType
				RestType
				NonNullableType
				OptionalType
				NullableType
				NameExpression
				TypeApplication
		 * @return {String} if the type is found, then return string, otherwise null
		 */
		convertJsDocType : function(jsdocType, env) {
			var allTypes = env.getAllTypes();
			if (!jsdocType) {
				return null;
			}

			var i;
			switch (jsdocType.type) {
				case 'NullableLiteral':
				case 'AllLiteral':
				case 'NullLiteral':
					return "Object";

				case 'UndefinedLiteral':
				case 'VoidLiteral':
					return "undefined";

				case 'UnionType':
					// TODO no direct handling of union types
					// for now, just return the first of the union
					if (jsdocType.elements && jsdocType.elements.length > 0) {
						return this.convertJsDocType(jsdocType.elements[0], env);
					}
					return "Object";

				case 'RestType':
					return "Array.<" + this.convertJsDocType(jsdocType.expression, env) + ">";
				case 'ArrayType':
					if (jsdocType.elements && jsdocType.elements.length > 0) {
						// assume array type is type of first element, not correct, but close enough
						return "Array.<" + this.convertJsDocType(jsdocType.elements[0], env) + ">";
					}
					return "Array";

				case 'FunctionType':
					var ret = this.convertJsDocType(jsdocType.result, env);
					if (!ret) {
						ret = "Object";
					}
					var params = [];
					if (jsdocType.params) {
						for (i = 0; i < jsdocType.params.length; i++) {
							// this means that if no name is used, then the type name is used (if a simple type)
							var param = jsdocType.params[i].name;
							if (!param) {
								param = 'arg'+i;
							}
							var paramType = "";
							if (jsdocType.params[i].expression) {
								paramType = "/" + this.convertJsDocType(jsdocType.params[i].expression, env);
							}
							params.push(param + paramType);
						}
					}
					// TODO FIXADE must also handle @constructor
					var funcConstr;
					if (jsdocType['new'] && jsdocType['this']) {
						// this is actually a constructor
						var maybeRet = this.convertJsDocType(jsdocType['this'], env);
						if (maybeRet) {
							ret = maybeRet;
						}
						funcConstr = "*";
					} else {
						funcConstr = "?";
					}
					return funcConstr + ret + ":" + params.join(',');

				case 'TypeApplication':
					var expr = this.convertJsDocType(jsdocType.expression, env);
					if (expr === "Array" && jsdocType.applications && jsdocType.applications.length > 0) {
						// only parameterize arrays not handling objects yet
						return "Array.<" + this.convertJsDocType(jsdocType.applications[0], env) + ">";
					}
					return expr;
				case 'ParameterType':
				case 'NonNullableType':
				case 'OptionalType':
				case 'NullableType':
					return this.convertJsDocType(jsdocType.expression, env);

				case 'NameExpression':
					var name = jsdocType.name;
					name = name.trim();
					if (allTypes[name]) {
						return name;
					} else {
						var capType = name[0].toUpperCase() + name.substring(1);
						if (allTypes[capType]) {
							return capType;
						}
					}
					return null;
				case 'RecordType':
					var fields = { };
					for (i = 0; i < jsdocType.fields.length; i++) {
						var field = jsdocType.fields[i];
						var fieldType = this.convertJsDocType(field, env);
						fields[field.key] = fieldType ? fieldType : "Object";
					}
					// create a new type to store the record
					var obj = env.newFleetingObject();
					for (var prop in fields) {
						if (fields.hasOwnProperty(prop)) {
							// add the variable to the new object, which happens to be the top-level scope
							env.addVariable(prop, obj, fields[prop]);
						}
					}
					return obj;
				case 'FieldType':
					return this.convertJsDocType(jsdocType.value, env);
			}
			return null;
		},

		// type styling
		styleAsProperty : function(prop, useHtml) {
			return useHtml ? "<span style=\"color: blue;font-weight:bold;\">" + prop + "</span>": prop;
		},
		styleAsType : function(type, useHtml) {
			return useHtml ? "<span style=\"color: green;font-weight:bold;\">" + type + "</span>": type;
		},
		styleAsOther : function(text, useHtml) {
			return useHtml ? "<span style=\"font-style:italic;\">" + text + "</span>": text;
		},

		/**
		 * creates a human readable type name from the name given
		 */
		createReadableType : function(typeName, env, useFunctionSig, depth, useHtml) {
			depth = depth || 0;
			var first = typeName.charAt(0);
			if (first === "?" || first === "*") {
				// a function
				var returnEnd = this.findReturnTypeEnd(typeName);
				if (returnEnd === -1) {
					returnEnd = typeName.length;
				}
				var funType = typeName.substring(1, returnEnd);
				if (useFunctionSig) {
					// convert into a function signature
					var prefix = first === "?" ? "" : "new";
					var args = typeName.substring(returnEnd+1, typeName.length);
					var argsSigs = [];
					var self = this;
					args.split(",").forEach(function(arg) {
						var typeSplit = arg.indexOf("/");
						var argName = typeSplit > 0 ? arg.substring(0, typeSplit) : arg;
						argName = self.styleAsProperty(argName, useHtml);
						var argSig = typeSplit > 0 ? arg.substring(typeSplit + 1) : "";

						if (argSig) {
							var sig = self.createReadableType(argSig, env, true, depth+1, useHtml);
							if (sig === "{  }") {
								argsSigs.push(argName);
							} else {
								argsSigs.push(argName + ":" + sig);
							}
						} else {
							argsSigs.push(argName);
						}
					});

					// note the use of the ⇒ &rArr; char here.  Must use the char directly since js_render will format it otherwise
					return prefix + "(" + argsSigs.join(", ") +
						(useHtml ? ")<br/>" + proposalUtils.repeatChar("&nbsp;&nbsp;", depth+1) + "⇒ " : ") ⇒ ") +
						this.createReadableType(funType, env, true, depth + 1, useHtml);
				} else {
					// use the return type
					return this.createReadableType(funType, env, true, depth, useHtml);
				}
			} else if (typeName.indexOf(this.GEN_NAME) === 0) {
				// a generated object
				if (depth > 1) {
					// don't show inner types
					return this.styleAsOther("{...}", useHtml);
				}

				// create a summary
				var type = env.findType(typeName);
				var res = "{ ";
				var props = [];
				for (var val in type) {
					if (type.hasOwnProperty(val) && val !== "$$proto") {
						var name;
						// don't show inner objects
						name = this.createReadableType(type[val].typeName, env, true, depth + 1, useHtml);
						props.push((useHtml ? "<br/>" + proposalUtils.repeatChar("&nbsp;&nbsp;&nbsp;&nbsp;", depth+1) : "" ) +
							this.styleAsProperty(val, useHtml) + ":" + name);
					}
				}
				res += props.join(", ");
				return res + " }";
			} else if (this.isArrayType(typeName)) {
				var typeParameter = this.extractArrayParameterType(typeName);
				if (typeParameter !== "Object") {
					typeName = this.createReadableType(typeParameter, env, true, depth+1, useHtml) + "[]";
				} else {
					typeName = "[]";
				}
				return typeName;
			} else {
				return this.styleAsType(typeName, useHtml);
			}
		}
	};
});
