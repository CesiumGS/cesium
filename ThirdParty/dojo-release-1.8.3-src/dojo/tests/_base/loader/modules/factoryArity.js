define(function(require, exports, module){
	var impliedDep = require("./impliedDep1");
	return {
		module:module,
		id:"factoryArity",
		impliedDep:impliedDep.id
	};
});