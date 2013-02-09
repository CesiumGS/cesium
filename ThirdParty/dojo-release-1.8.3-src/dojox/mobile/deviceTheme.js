(typeof define === "undefined" ? function(deps, def) { def(); } : define)([
	"dojo/_base/config",
	"dojo/_base/lang",
	"dojo/_base/window",
	"require"
], function(config, lang, win, require){

	// module:
	//		dojox/mobile/deviceTheme

	var dm = lang && lang.getObject("dojox.mobile", true) || {};

	var DeviceTheme = function(){
		// summary:
		//		Automatic theme loader.
		// description:
		//		This module detects the user agent of the browser and loads the
		//		appropriate theme files. It can be enabled by simply requiring
		//		dojox/mobile/deviceTheme from your application.
		//
		//		You can also pass an additional query parameter string,
		//		device={theme id} to force a specific theme through the browser
		//		URL input. The available theme ids are Android, BlackBerry,
		//		Custom, iPhone, and iPad. The names are case-sensitive. If the given
		//		id does not match, the iPhone theme is used.
		//
		//	|	http://your.server.com/yourapp.html // automatic detection
		//	|	http://your.server.com/yourapp.html?theme=Android // forces Android theme
		//
		//		To simulate a particular device, the user agent may be
		//		overridden by setting dojoConfig.mblUserAgent.
		//
		//		By default, an all-in-one theme file (e.g. themes/iphone/iphone.css) is
		//		loaded. The all-in-one theme files contain style sheets for all the
		//		dojox/mobile widgets regardless of whether they are used in your
		//		application or not.
		//		If you want to choose what theme files to load, you can specify them
		//		via dojoConfig as shown in the following example:
		//
		//	|	data-dojo-config="parseOnLoad:true, mblThemeFiles:['base','Button']"
		//
		//		Or you may want to use dojox/mobile/themeFiles as follows to get the
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
		//		Note that loading of the theme files is performed asynchronously by
		//		the browser, so you cannot assume that the load has been completed
		//		when your application is initialized. For example, if some widget in
		//		your application uses node dimensions that cannot be determined
		//		without CSS styles being applied to them to calculate its layout at
		//		initialization, the layout calculation may fail.
		//
		//		A possible workaround for this problem is to use dojo.require to load
		//		deviceTheme.js and place it in a separate `<script>` block immediately
		//		below the script tag that loads dojo.js as below. However, this is not
		//		guaranteed to solve the problem.
		//
		//	|	<script src="dojo.js"></script>
		//	|	<script>
		//	|		dojo.require("dojox.mobile.deviceTheme");
		//	|	</script>
		//	|	<script>
		//	|		dojo.require("dojox.mobile");
		//	|		....
		//
		//		Another option is to use deviceTheme.js as non-dojo JavaScript code.
		//		You could load deviceTheme.js prior to loading dojo.js using a
		//		script tag as follows.
		//
		//	|	<script src="dojox/mobile/deviceTheme.js"
		//	|		 data-dojo-config="mblThemeFiles:['base','Button']"></script>
		//	|	<script src="dojo/dojo.js" data-dojo-config="parseOnLoad: true"></script>
		//
		//		A safer solution would be to not use deviceTheme and use `<link>`
		//		or `@import` instead to load the theme files.

		if(!win){
			win = window;
			win.doc = document;
			win._no_dojo_dm = dm;
		}
		config = config || win.mblConfig || {};
		var scripts = win.doc.getElementsByTagName("script");
		for(var i = 0; i < scripts.length; i++){
			var n = scripts[i];
			var src = n.getAttribute("src") || "";
			if(src.match(/\/deviceTheme\.js/i)){
				config.baseUrl = src.replace("deviceTheme\.js", "../../dojo/");
				var conf = (n.getAttribute("data-dojo-config") || n.getAttribute("djConfig"));
				if(conf){
					var obj = eval("({ " + conf + " })");
					for(var key in obj){
						config[key] = obj[key];
					}
				}
				break;
			}else if(src.match(/\/dojo\.js/i)){
				config.baseUrl = src.replace("dojo\.js", "");
				break;
			}
		}

		this.loadCssFile = function(/*String*/file){
			// summary:
			//		Loads the given CSS file programmatically.
			var link = win.doc.createElement("link");
			link.href = file;
			link.type = "text/css";
			link.rel = "stylesheet";
			var head = win.doc.getElementsByTagName('head')[0];
			head.insertBefore(link, head.firstChild);
			dm.loadedCssFiles.push(link);
		};

		this.toUrl = function(/*String*/path){
			// summary:
			//		A wrapper for require.toUrl to support non-dojo usage.
			return require ? require.toUrl(path) : config.baseUrl + "../" + path;
		};

		this.setDm = function(/*Object*/_dm){
			// summary:
			//		Replaces the dojox/mobile object.
			// description:
			//		When this module is loaded from a script tag, dm is a plain
			//		local object defined at the begining of this module.
			//		common.js will replace the local dm object with the
			//		real dojox/mobile object through this method.
			dm = _dm;
		};

		this.themeMap = config.themeMap || [
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
				"BB10",
				"blackberry",
				[]
			],
			[
				"iPhone",
				"iphone",
				[]
			],
			[
				"iPad",
				"iphone",
				[this.toUrl("dojox/mobile/themes/iphone/ipad.css")]
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

		dm.loadedCssFiles = [];
		this.loadDeviceTheme = function(/*String?*/userAgent){
			// summary:
			//		Loads a device-specific theme according to the user-agent
			//		string.
			// description:
			//		This function is automatically called when this module is
			//		evaluated.
			var t = config.mblThemeFiles || dm.themeFiles || ["@theme"];
			var i, j;
			var m = this.themeMap;
			var ua = userAgent || config.mblUserAgent || (location.search.match(/theme=(\w+)/) ? RegExp.$1 : navigator.userAgent);
			for(i = 0; i < m.length; i++){
				if(ua.match(new RegExp(m[i][0]))){
					var theme = m[i][1];
					var cls = win.doc.documentElement.className;
					cls = cls.replace(new RegExp(" *" + dm.currentTheme + "_theme"), "") + " " + theme + "_theme";
					win.doc.documentElement.className = cls;
					dm.currentTheme = theme;
					var files = [].concat(m[i][2]);
					for(j = 0; j < t.length; j++){ 
						var isArray = (t[j] instanceof Array || typeof t[j] == "array");
						var path;
						if(!isArray && t[j].indexOf('/') !== -1){
							path = t[j];
						}else{
							var pkg = isArray ? (t[j][0]||"").replace(/\./g, '/') : "dojox/mobile";
							var name = (isArray ? t[j][1] : t[j]).replace(/\./g, '/');
							var f = "themes/" + theme + "/" +
								(name === "@theme" ? theme : name) + ".css";
							path = pkg + "/" + f;
						}
						files.unshift(this.toUrl(path));
					}
					//remove old css files
					for(var k = 0; k < dm.loadedCssFiles.length; k++){
						var n = dm.loadedCssFiles[k];
						n.parentNode.removeChild(n);
					}
					dm.loadedCssFiles = [];
					for(j = 0; j < files.length; j++){
						this.loadCssFile(files[j].toString());
					}

					if(userAgent && dm.loadCompatCssFiles){
						dm.loadCompatCssFiles();
					}
					break;
				}
			}
		};
	};

	// Singleton.  (TODO: can we replace DeviceTheme class and singleton w/a simple hash of functions?)
	var deviceTheme = new DeviceTheme();

	deviceTheme.loadDeviceTheme();
	window.deviceTheme = dm.deviceTheme = deviceTheme;

	return deviceTheme;
});
