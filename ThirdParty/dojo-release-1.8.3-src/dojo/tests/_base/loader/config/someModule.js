define(["pkg/m1", "pkg/m2", "require", "module"], function(m1, m2, require, module){
	require({config:{
		"pkg/m1":{configThroughMappedRefForM1:"configThroughMappedRefForM1"},
		"pkg/m2":{configThroughMappedRefForM1:"configThroughMappedRefForM1"}
	}});
	return {
		getConfig:function(){return module.config();},
		m1:m1,
		m2:m2
	};
});
