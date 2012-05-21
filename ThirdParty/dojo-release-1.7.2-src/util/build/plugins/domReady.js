///
// \module build/plugins/domReady
//
define(["../buildControl"], function(bc) {
	return {
		start:function(
			mid,
			referenceModule
		){
			return bc.amdResources[bc.getSrcModuleInfo("dojo/domReady", referenceModule).mid];
		}
	};
});
