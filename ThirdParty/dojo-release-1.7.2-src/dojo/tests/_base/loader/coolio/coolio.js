require({
	packages:[{
		name:"cdojo",
		location:(dojoConfig.coolioDojoRoot || dojoConfig.coolioRoot) + "/dojo",
		packageMap:{dojo:"cdojo"}
	},{
		name:"cdijit",
		location:(dojoConfig.coolioDojoRoot || dojoConfig.coolioRoot) + "/dijit",
		packageMap:{dojo:"cdojo", dijit:"cdijit"}
    },{
		name:"coolio",
		location:dojoConfig.coolioRoot + "/coolio",
		packageMap:{dojo:"cdojo", dijit:"cdijit"}
	}],
	cdojoScope:[["dojo", "cdojo"], ["dijit", "cdijit"]]
});

