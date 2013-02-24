var dohArgs= (window.parent.doh && window.parent.doh.dohArgs) || dohArgs || {
	async:1,
	baseUrl:"."
};
var requirejsArgs= requirejsArgs || {
	dojoLocation:"../../../.."
};
var dojoConfig= {
	async:dohArgs.async,
	baseUrl:dohArgs.baseUrl || ".",
	packages:[{
		name:'dojo',
		location:requirejsArgs.dojoLocation
	},{
		name:'doh',
		location:requirejsArgs.dojoLocation + '/../util/doh'
	},{
		name:'dojox',
		location:requirejsArgs.dojoLocation + '/../dojox'
	}],
	has:{
		"dojo-requirejs-api":1,
		"config-tlmSiblingOfDojo":0
	}
};
if(typeof require!="undefined"){
	(function(){
		for(var p in require){
			dojoConfig[p]= require[p];
		}
	})();
}
