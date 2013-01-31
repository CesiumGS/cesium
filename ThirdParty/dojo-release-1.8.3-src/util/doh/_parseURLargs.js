(function(){
	var
		boot =
			// zero to many scripts to load a configuration and/or loader.
			// i.e. path-to-util/doh/runner.html?boots=path-to/config.js,path-to/require.js
			["../../dojo/dojo.js"],

		standardDojoBoot = boot,

		test =
			// zero to many AMD modules and/or URLs to load; provided by csv URL query parameter="test"
			// For example, the URL...
			//
			//		 path-to-util/doh/runner.html?test=doh/selfTest,my/path/test.js
			//
			// ...will load...
			//
			//	 * the AMD module doh/selfTest
			//	 * the plain old Javascript resource my/path/test.js
			//
			["dojo/tests/module"],

		paths = 
			// zero to many path items to pass to the AMD loader; provided by semicolon separated values 
			// for URL query parameter="paths"; each path item has the form <from-path>,<to-path>
			// i.e. path-to-util/doh/runner.html?paths=my/from/path,my/to/path;my/from/path2,my/to/path2
			{},
			
		dohPlugins = 
			// Semicolon separated list of files to load before the tests.
			// Idea is to override aspects of DOH for reporting purposes.
			"",

		breakOnError = 
			// boolean; instructs doh to call the debugger upon a test failures; this can be helpful when
			// trying to isolate exactly where the test failed
			false,

		async = 
			// boolean; config require.asyc==true before loading boot; this will have the effect of making
			// version 1.7+ dojo bootstrap/loader operating in async mode
			false,

		sandbox = 
			// boolean; use a loader configuration that sandboxes the dojo and dojox objects used by doh
			false,

		trim = function(text){
			if(text instanceof Array){
				for (var result= [], i= 0; i<text.length; i++) {
					result.push(trim(text[i]));
				}
				return result;
			}else{
				return text.match(/[^\s]*/)[0]; 
			}
		};

		qstr = window.location.search.substr(1);

	if(qstr.length){
		for(var qparts = qstr.split("&"), x = 0; x < qparts.length; x++){
			var tp = qparts[x].split("="), name=tp[0], value=(tp[1]||"").replace(/[<>"':\(\)]/g, ""); // replace() to avoid XSS attack
			//Avoid URLs that use the same protocol but on other domains, for security reasons.
			if (value.indexOf("//") === 0 || value.indexOf("\\\\") === 0) {
				throw "Insupported URL";
			}
			switch(name){
				// Note:
				//	 * dojoUrl is deprecated, and is a synonym for boot
				//	 * testUrl is deprecated, and is a synonym for test
				//	 * testModule is deprecated, and is a synonym for test (dots are automatically replaced with slashes)
				//	 * registerModulePath is deprecated, and is a synonym for paths
				case "boot":
				case "dojoUrl":
					boot= trim(value.split(","));
					break;

				case "test":
				case "testUrl":
					test= trim(value.split(","));
					break;

				case "testModule":
					test= trim(value.replace(/\./g, "/").split(","));
					break;

				// registerModulePath is deprecated; use "paths"
				case "registerModulePath":
				case "paths":
					for(var path, modules = value.split(";"), i= 0; i<modules.length; i++){
						path= modules[i].split(",");
						paths[trim(path[0])]= trim(path[1]);
					}
					break;

				case "breakOnError":
					breakOnError= true;
					break;

				case "sandbox":
					sandbox= true;
					break;

				case "async":
					async= true;
					break;
				case "dohPlugins":
					dohPlugins=value.split(";");
					break;
			}
		}
	}

	function fixHeight(dojo){
		// IE9 doesn't give test iframe height because no nodes have an explicit pixel height!
		// Give outer table a pixel height.
		if(dojo.isIE){
			var headerHeight=0;
			var rows=dojo.query('#testLayout > tbody > tr');
			for(var i=0; i<rows.length-1; i++){
				headerHeight+=dojo.position(rows[i]).h;
			}
			try{
				// we subtract the headerHeight from the window height because the table row containing the tests is height:100% so they will stretch the table to the intended height.
				dojo.byId('testLayout').style.height=(dojo.window.getBox().h-headerHeight)+"px";
			}catch(e){
				// An obscure race condition when you load the runner in IE from the command line causes the window reported height to be 0.
				// Try to recover after the window finishes rendering.
				setTimeout(function(){ fixHeight(dojo); },0);
			}
		}
	}

	var config;
	if(sandbox){
		// configure the loader assuming the dojo loader; of course the injected boot(s) can override this config
		config= {
			paths: paths,
			// this config uses the dojo loader's scoping features to sandbox the version of dojo used by doh
			packages: [{
				name: 'doh',
				location: '../util/doh',
				// here's the magic...everytime doh asks for a "dojo" module, it gets mapped to a "dohDojo"
				// module; same goes for dojox/dohDojox since doh uses dojox
				packageMap: {dojo:"dohDojo", dojox:"dohDojox"}
			},{
				// now define the dohDojo package...
				name: 'dohDojo',
				location: '../dojo',
				packageMap: {dojo: "dohDojo", dojox: "dohDojox"}
			},{
				// and the dohDojox package...
				name: 'dohDojox',
				location: '../dojox',
				// and dojox uses dojo...that is, dohDojox...which must be mapped to dohDojo in the context of dohDojox
				packageMap: {dojo: "dohDojo", dojox: "dohDojox"}
			}],
			
			// next, we need to preposition a special configuration for dohDojo
			cache: {
				"dohDojo*_base/config": function(){
					define([], {
						// this configuration keeps dojo, dijit, and dojox out of the global space
						scopeMap: [["dojo", "dohDojo"], ["dijit", "dohDijit"], ["dojox", "dohDojox"]],
						isDebug: true,
						noGlobals: true
					});
				}
			},

			// control the loader; don't boot global dojo, doh will ask for dojo itself
			has: {
				"dojo-sniff": 0,
				"dojo-loader": 1,
				"dojo-boot": 0,
				"dojo-test-sniff": 1
			},

			// no sniffing; therefore, set the baseUrl
			baseUrl: "../../dojo",

			deps: ["dohDojo", "doh", "dohDojo/window"],

			callback: function(dohDojo, doh){
				dohDojo.ready(function(){
					fixHeight(dohDojo);
					doh.breakOnError= breakOnError;
					require(test);
					dohDojo.ready(doh, "run");
				});
			},

			async: async
		};
	}else{
		config= {
			paths: paths,
			deps: ["dojo", "doh", "dojo/window"],
			callback: function(dojo, doh){
				dojo.ready(function(){
					fixHeight(dojo);
					doh.breakOnError= breakOnError;
					require(test);
					dojo.ready(doh, "run");
				});
			},
			async: async,
			isDebug: 1
		};
	}
	
	// load all of the dohPlugins
	if(dohPlugins){
		var i = 0;
		for(i = 0; i < dohPlugins.length; i++){
			config.deps.push(dohPlugins[i]);
		}
	}
	
	require = config;

	// now script inject any boots
	for(var e, i = 0; i < boot.length; i++) {
		if(boot[i]){
			e = document.createElement("script");
			e.type = "text/javascript";
			e.src = boot[i];
			e.charset = "utf-8";
			document.getElementsByTagName("head")[0].appendChild(e);
		}
	}
})();