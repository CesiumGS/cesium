var profile = (function(){
	var testResourceRe = /\/tests\//,

		copyOnly = function(filename, mid){
			var list = {
				"dojox/dojox.profile":1,
				"dojox/package.json":1,
				"dojox/mobile/themes/common/compile":1
			};
			return (mid in list) || /^dojox\/resources\//.test(mid) || /(png|jpg|jpeg|gif|tiff)$/.test(filename);
		},

		excludes = [
			"secure",
			"cometd",
			"data/(demos|ItemExplorer|StoreExplorer|restListener)",
			"drawing",
			"editor/plugins/(ResizeTableColumn|SpellCheck)",
			"embed/(IE)",
			"flash",
			"gantt",
			"help",
			"image/(Gallery|SlideShow|ThumbnailPicker)",
			"jq",
			"jsonPath",
			"lang/(aspect|async|docs|observable|oo|typed|functional/(binrec|curry|linrec|listcomp|multirec|numrec|tailrec|util|zip))",
			"layout/(BorderContainer|dnd|ext-dijit)",
			"mobile/app/",
			"rails",
			"robot",
			"socket/Reconnect",
			"storage",
			"sql",
			"widget/(AnalogGauge|AutoRotator|BarGauge|Calendar|CalendarFx|CalendarViews|DataPresentation|DocTester|DynamicTooltip|FeedPortlet|FilePicker|FisheyeList|gauge|Iterator|Loader|Pager|Portlet|RollingList|Rotator|rotator|SortList|UpgradeBar)",
			"wire",
			"xmpp"
		],

		excludesRe = new RegExp(("^dojox/(" + excludes.join("|") + ")").replace(/\//, "\\/")),

		usesDojoProvideEtAl = function(mid){
			return excludesRe.test(mid);
		};

	return {
		resourceTags:{
			test: function(filename, mid){
				return testResourceRe.test(mid);
			},

			copyOnly: function(filename, mid){
				return copyOnly(filename, mid);
			},

			amd: function(filename, mid){
				return !testResourceRe.test(mid) && !copyOnly(filename, mid) && !usesDojoProvideEtAl(mid) && /\.js$/.test(filename);
			},

			miniExclude: function(filename, mid){
				return 0;
			}
		},

		trees:[
			[".", ".", /(\/\.)|(~$)/]
		]
	};
})();
