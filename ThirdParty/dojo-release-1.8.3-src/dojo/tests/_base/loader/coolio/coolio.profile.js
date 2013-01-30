var profile = (function(){
	return {
		// relative to this file
		basePath:"../../../../..",

		// relative to base path
		releaseDir:"dojo/tests/_base/loader",

		optimize:0,
		layerOptimize:0,
		insertAbsMids:0,
		releaseName:"coolioBuilt",
		selectorEngine:"lite",
		//scopeMap:[["dojo", "cdojo"], ["dijit", "cdijit"], , ["dojox", "dojox"]],

		// and include dom-ready support
		staticHasFeatures:{
			"dojo-publish-privates":1
		},


		packages:[{
			name:"dojo",
			location:"./dojo",
			trees:[
				[".", ".", /(\/\.)|(^\.)|(~$)|(tests\/_base\/)/]
			]
		},{
			name:"dijit",
			location:"./dijit"
		},{
			name:"dojox",
			location:"./dojox"
		},{
			name:"coolio",
			location:"./dojo/tests/_base/loader/coolio",
			resourceTags:{
				amd: function(filename, mid){
					return /calendar-amd\.js$/.test(filename);
				}
			}
		}],

		layers:{
			"dojo/dojo":{
				customBase:1
			},
			"dojo/main":{
				include:["dojo/parser"]
			},
			"dijit/Calendar":{
				include: [
					"dijit/Calendar"
				]
			}
		}
	};
})();
