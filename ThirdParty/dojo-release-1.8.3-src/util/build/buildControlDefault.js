define([
	"./buildControlBase"
], function(bc){
	var defaultBc = {
		// v1.6- default values
		internStrings:true,
		internSkipList:[],
		optimize:"",
		layerOptimize:"shrinksafe",
		cssOptimize:"",
		cssImportIgnore:"",
		stripConsole:"normal",
		scopeMap:[],
		insertAbsMids:1,
		applyDojoPragmas:1,
		localeList:"ar,ca,cs,da,de,el,en-gb,en-us,es-es,fi-fi,fr-fr,he-il,hu,it-it,ja-jp,ko-kr,nl-nl,nb,pl,pt-br,pt-pt,ru,sk,sl,sv,th,tr,zh-tw,zh-cn".split(","),


		// this is a dojo pragma
		replaceLoaderConfig:1,

		defaultConfig:{
			hasCache:{
				// these are the values given above, not-built client code may test for these so they need to be available
				'dojo-built':1,
				'dojo-loader':1,
				'dom':1,
				'host-browser':1,
				"config-tlmSiblingOfDojo":1,

				// default
				"config-selectorEngine":"acme"
			},
			async:0
		},

		files:[],
		dirs:[],
		trees:[],
		replacements:{},

		staticHasFeatures:{
			// consider turning these hard on for standard 1.x build
			//'config-publishRequireResult':1,
			//'config-tlmSiblingOfDojo':1,

			'extend-dojo':1,
			'dojo-amd-factory-scan':0,
			'dojo-built':1,
			'dojo-combo-api':0,
			'dojo-log-api':1,
			'dojo-test-sniff':0,// must be turned on for several tests to work
			'dojo-config-addOnLoad':1,
			'dojo-config-api':1,
			'dojo-config-require':1,
			'dojo-dom-ready-api':1,
			'dojo-guarantee-console':1,
			'dojo-has-api':1,
			'dojo-inject-api':1,
			'dojo-loader':1,
			'dojo-modulePaths':1,
			'dojo-moduleUrl':1,
			'dojo-publish-privates':0,
			'dojo-requirejs-api':0,
			'dojo-sniff':1,
			'dojo-sync-loader':1,
			'dojo-timeout-api':1,
			'dojo-trace-api':0,
			'dojo-undef-api':0,
			'dojo-v1x-i18n-Api':1,
			'dojo-xhr-factory':1,
			"dojo-fast-sync-require":1,
			'config-deferredInstrumentation':1,
			'dom':1,
			'host-browser':1,
			'host-node':0,
			'host-rhino':0
		},

		discoveryProcs:["build/discover"],

		plugins:{
			"dojo/text":"build/plugins/text",
			"dojo/i18n":"build/plugins/i18n",
			"dojo/has":"build/plugins/has",
			"dojo/domReady":"build/plugins/domReady",
			"dojo/loadInit":"build/plugins/loadInit",
			"dojo/require":"build/plugins/require",
			"dojo/selector/_loader":"build/plugins/querySelector"
		},

		gates:[
			// [synchronized?, gate-name, gate-message]
			[0, "read", "reading resources"],
			[0, "text", "processing raw resource content"],
			[0, "tokenize", "tokenizing resource"],
			[0, "tokens", "processing resource tokens"],
			[0, "parse", "parsing resource"],
			[1, "ast", "processing resource AST"],
			[1, "optimize", "executing global optimizations"],
			[1, "write", "writing resources"],
			[1, "cleanup", "cleaning up"],
			[1, "report", "reporting"]
		],

		transformConfig: {},

		transforms:{
			trace:				["build/transforms/trace", "read"],
			read:				["build/transforms/read", "read"],
			dojoPragmas:		["build/transforms/dojoPragmas", "read"],
			insertSymbols:		["build/transforms/insertSymbols", "read"],
			depsDeclarative:	["build/transforms/depsDeclarative", "read"],
			depsScan:			["build/transforms/depsScan", "ast"],
			hasFixup:			["build/transforms/hasFixup", "ast"],
			write:				["build/transforms/write", "write"],
			writeAmd:			["build/transforms/writeAmd", "write"],
			writeOptimized: 	["build/transforms/writeOptimized", "write"],
			copy:				["build/transforms/copy", "write"],
			writeDojo:			["build/transforms/writeDojo", "write"],
			optimizeCss:		["build/transforms/optimizeCss", "optimize"],
			writeCss:			["build/transforms/writeCss", "write"],
			hasFindAll:			["build/transforms/hasFindAll", "read"],
			hasReport:			["build/transforms/hasReport", "cleanup"],
			depsDump:			["build/transforms/depsDump", "cleanup"],
			dojoReport:			["build/transforms/dojoReport", "report"],
			report:				["build/transforms/report", "report"]
		},

		transformJobs:[[
				// immediately filter the stuff to not be transformed in any way
				function(resource, bc){
					return(bc.mini && resource.tag.miniExclude) || (!bc.copyTests && resource.tag.test) || (resource.tag.ignore);
				},
				[]
			],[
				// if the tag says just copy, then just copy
				function(resource, bc){
					return resource.tag.copyOnly;
				},
				["copy"]
			],[
				// the synthetic report module
				function(resource, bc){
					return resource.tag.report;
				},
				["dojoReport", "insertSymbols", "report"]
			],[
				// dojo.js, the loader
				function(resource, bc){
					if(resource.mid=="dojo/dojo"){
						bc.loader = resource;
						resource.boots = [];
						// the loader is treated as an AMD module when creating the "dojo" layer, but and AMD dependency scan won't
						// work because it's not an AMD module; therefore, initialize deps here and make sure not to do the depsScan transform
						resource.deps = [];
						bc.amdResources[resource.mid] = resource;
						return true;
					}
					return false;
				},
				["read", "dojoPragmas", "hasFindAll", "hasFixup", "writeDojo", "writeOptimized"]
			],[
				// package has module
				function(resource, bc){
					if(/^\w+\/has$/.test(resource.mid)){
						bc.amdResources[resource.mid] = resource;
						return true;
					}
					return false;
				},
				["read", "dojoPragmas", "hasFindAll", "hasFixup", "depsScan", "writeAmd", "writeOptimized", "hasReport", "depsDump"]
			],[
				// flattened nls bundles
				function(resource, bc){
					return !!resource.tag.flattenedNlsBundle;
				},
				["writeAmd", "writeOptimized"]
			],[
				// nls resources
				function(resource, bc){
					if(/\/nls\//.test(resource.mid) ||	/\/nls\/.+\.js$/.test(resource.src)){
						resource.tag.nls = 1;
						bc.amdResources[resource.mid] = resource;
						return true;
					}
					return false;
				},
				["read", "dojoPragmas", "hasFindAll", "hasFixup", "depsScan", "writeAmd", "writeOptimized"]
			],[
				// synthetic AMD modules (used to create layers on-the-fly
				function(resource, bc){
					if(resource.tag.synthetic && resource.tag.amd){
						bc.amdResources[resource.mid] = resource;
						return true;
					}
					return false;
				},
				// just like regular AMD modules, but without a bunch of unneeded transforms
				["depsScan", "writeAmd", "writeOptimized"]
			],[
				// synthetic dojo/loadInit! resources
				// FIXME: can't this be added to the previous transform?
				function(resource, bc){
					if(resource.tag.loadInitResource){
						bc.amdResources[resource.mid] = resource;
						return true;
					}
					return false;
				},
				// just like regular AMD modules (the next transform job), but without a bunch of unneeded transforms
				["writeAmd", "writeOptimized"]
			],[
				// AMD module:
				// already marked as an amd resource
				// ...or...
				// not dojo/dojo.js (filtered above), not package has module (filtered above), not nls bundle (filtered above), not test or building test, not build control script or profile script but still a Javascript resource...
				function(resource, bc){
					if(resource.tag.amd || (/\.js$/.test(resource.src) && (!resource.tag.test || bc.copyTests=="build") && !/\.(bcs|profile)\.js$/.test(resource.src))){
						bc.amdResources[resource.mid] = resource;
						return true;
					}
					return false;
				},
				["read", "dojoPragmas", "hasFindAll", "insertSymbols", "hasFixup", "depsScan", "writeAmd", "writeOptimized"]
			],[
				// Declarative Resource:
				// This resource (usually HTML) should be scanned for declarative dependencies and copied.
				function(resource, bc){
					return resource.tag.declarative;
				},
				["read", "dojoPragmas", "depsDeclarative", "write"]
			],[
				// a test resource; if !bc.copyTests then the resource was filtered in the first item; otherwise, if the resource is a potential module and building tests, then it was filtered above;
				function(resource, bc){
					return resource.tag.test;
				},
				["read", "dojoPragmas", "write"]
			],[
				// html file; may need access contents for template interning and/or dojoPragmas; therefore, can't use copy transform
				function(resource, bc){
					return /\.(html|htm)$/.test(resource.src);
				},
				["read", "dojoPragmas", "write"]
			],[
				// css that are designated to compact
				function(resource, bc){
					return /\.css$/.test(resource.src);
				},
				["read", "optimizeCss", "write"]
			],[
				// just copy everything else except tests which were copied above iff desired...
				function(resource, bc){
					return !resource.tag.test;
				},
				["copy"]
			]
		]
	};
	for(var p in defaultBc){
		bc[p] = defaultBc[p];
	}
	return bc;
});
