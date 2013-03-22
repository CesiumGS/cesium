var profile = (function(){
	return {
		localeList:0,
		resourceTags:{
			ignore: function(filename, mid){
				return /(profile\.js|html)$/.test(filename);
			},

			amd: function(filename, mid){
				return mid=="i18nTest/amdModule";
			}
		},

		// relative to this file
		basePath:"..",

		scopeMap:[["dojo", "dojo"], ["dijit",0], ["dojox",0]],

		packages:[{
			name:"dojo",
			location:"./dojo"
		},{
			name:"i18nTest",
			location:"./i18n-test"
		}],

		releaseDir:"./built-i18n-test",
		releaseName:"built-with-layers",
		layers:{
			"i18nTest/amdModule":{},
			"i18nTest/legacyModule":{}
		}
	};

})();
