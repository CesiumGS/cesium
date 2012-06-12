///
// \module build/plugins/loadInit
//
define(["../buildControl"], function(bc) {
	return {
		start:function(
			mid,
			referenceModule
		){
			return bc.amdResources[bc.getSrcModuleInfo(mid, referenceModule).mid];
		}
	};
});
