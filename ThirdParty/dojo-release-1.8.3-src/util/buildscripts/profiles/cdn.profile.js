require(["build/buildControlDefault"], function(bc){
	bc.defaultConfig.async = "legacyAsync";
	bc.defaultConfig.hasCache["dojo-cdn"] = 1;
});
var profile = {
};
