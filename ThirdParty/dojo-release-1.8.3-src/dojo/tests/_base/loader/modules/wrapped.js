if(require.has("dojo-amd-factory-scan")){

define(function(require, exports, module){
	exports.five = require("./data").five;
	exports.exports = module.exports;
});

}else{

define(["require", "exports", "module"], function(require, exports, module){
	exports.five = require("./data").five;
	exports.exports = module.exports;
});

}