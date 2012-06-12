define([
	"dojo/_base/array",
	"dojo/_base/config",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"require"
], function(array, config, lang, win, domClass, domConstruct, require){

	var dm = lang.getObject("dojox.mobile", true);
/*=====
	var dm = dojox.mobile
=====*/

	// module:
	//		dojox/mobile/deviceTheme
	// summary:
	//		Automatic Theme Loader
	// description:
	//		Detects the User Agent of the browser and loads appropriate theme files.
	//		Simply dojo.require this module to enable the automatic theme loading.
	//		For simulations, the user agent may be overridden by setting djConfig.mblUserAgent.
	//
	//		By default, an all-in-one theme file (e.g. themes/iphone/iphone.css) is
	//		loaded. The all-in-one theme files contain style sheets for all the
	//		dojox.mobile widgets regardless of whether they are used in your
	//		application or not.
	//		If you want to choose what theme files to load, you can specify them
	//		via djConfig as shown in the following example:
	//
	//	|	djConfig="parseOnLoad:true, mblThemeFiles:['base','Button']"
	//
	//		Or you may want to use dojox.mobile.themeFiles as follows to get the
	//		same result. Note that the assignment has to be done before loading
	//		deviceTheme.js.
	//
	//	|	dojo.require("dojox.mobile");
	//	|	dojox.mobile.themeFiles = ['base','Button'];
	//	|	dojo.require("dojox.mobile.deviceTheme");
	//
	//		In the case of this example, if iphone is detected, for example, the
	//		following files will be loaded:
	//
	//	|	dojox/mobile/themes/iphone/base.css
	//	|	dojox/mobile/themes/iphone/Button.css
	//
	//		If you want to load style sheets for your own custom widgets, you can
	//		specify a package name along with a theme file name in an array.
	//
	//	|	['base',['com.acme','MyWidget']]
	//
	//		In this case, the following files will be loaded.
	//
	//	|	dojox/mobile/themes/iphone/base.css
	//	|	com/acme/themes/iphone/MyWidget.css
	//
	//		If you specify '@theme' as a theme file name, it will be replaced with
	//		the theme folder name (e.g. 'iphone'). For example,
	//
	//	|	['@theme',['com.acme','MyWidget']]
	//
	//		will load the following files.
	//
	//	|	dojox/mobile/themes/iphone/iphone.css
	//	|	com/acme/themes/iphone/MyWidget.css
	//
	//		Note that the load of the theme files is performed asynchronously by
	//		the browser, and thus you cannot assume the load has been completed
	//		when your appliation is initialized. For example, if some widget in
	//		your application uses node dimensions that cannot be determined
	//		without CSS styles being applied to them to calculate its layout at
	//		initialization, the layout calculation may fail.
	//		Possible workaround for this problem is to use dojo.require to load
	//		deviceTheme.js and place it in a separate <script> block immediately
	//		below a script tag that loads dojo.js as below. This may (or may
	//		not) solve the problem.
	//
	//	|	<script src="dojo.js"></script>
	//	|	<script>
	//	|		dojo.require("dojox.mobile.deviceTheme");
	//	|	</script>
	//	|	<script>
	//	|		dojo.require("dojox.mobile");
	//	|		....
	//
	//		A better solution would be to not use deviceTheme and use <link>
	//		or @import instead to load the theme files.


	dm.loadCssFile = function(/*String*/file){
		// summary:
		//		Loads the given CSS file programmatically.
		dm.loadedCssFiles.push(domConstruct.create("LINK", {
			href: file,
			type: "text/css",
			rel: "stylesheet"
		}, win.doc.getElementsByTagName('head')[0]));
	};

	dm.themeMap = dm.themeMap || [
		// summary:
		//		A map of user-agents to theme files.
		// description:
		//		The first array element is a regexp pattern that matches the
		//		userAgent string.
		//
		//		The second array element is a theme folder name.
		//
		//		The third array element is an array of css file paths to load.
		//
		//		The matching is performed in the array order, and stops after the
		//		first match.
		[
			"Android",
			"android",
			[]
		],
		[
			"BlackBerry",
			"blackberry",
			[]
		],
		[
			"iPad",
			"iphone",
			[require.toUrl("dojox/mobile/themes/iphone/ipad.css")]
		],
		[
			"Custom",
			"custom",
			[]
		],
		[
			".*",
			"iphone",
			[]
		]
	];

	dm.loadDeviceTheme = function(/*String?*/userAgent){
		// summary:
		//		Loads a device-specific theme according to the user-agent
		//		string.
		// description:
		//		This function is automatically called when this module is
		//		evaluated.
		var t = config["mblThemeFiles"] || dm.themeFiles || ["@theme"];
		if(!lang.isArray(t)){ console.log("loadDeviceTheme: array is expected but found: "+t); }
		var i, j;
		var m = dm.themeMap;
		var ua = userAgent || config["mblUserAgent"] || (location.search.match(/theme=(\w+)/) ? RegExp.$1 : navigator.userAgent);
		for(i = 0; i < m.length; i++){
			if(ua.match(new RegExp(m[i][0]))){
				var theme = m[i][1];
				domClass.replace(win.doc.documentElement, theme + "_theme", dm.currentTheme ? dm.currentTheme + "_theme" : "");
				dm.currentTheme = theme;
				var files = [].concat(m[i][2]);
				for(j = t.length - 1; j >= 0; j--){
					var pkg = lang.isArray(t[j]) ? (t[j][0]||"").replace(/\./g, '/') : "dojox/mobile";
					var name = lang.isArray(t[j]) ? t[j][1] : t[j];
					var f = "themes/" + theme + "/" +
						(name === "@theme" ? theme : name) + ".css";
					files.unshift(require.toUrl(pkg+"/"+f));
				}
				//remove old css files
				array.forEach(dm.loadedCssFiles, function(n){
					n.parentNode.removeChild(n);
				});
				dm.loadedCssFiles = [];
				for(j = 0; j < files.length; j++){
					dm.loadCssFile(files[j].toString());
				}
				if(userAgent && dm.loadCompatCssFiles){ // we will assume compat is loaded and ready..
					dm.loadCompatCssFiles();
				}
				break;
			}
		}
	};
	
	if(dm.configDeviceTheme){
		dm.configDeviceTheme();
	}
	dm.loadDeviceTheme();

	return dm;
});
