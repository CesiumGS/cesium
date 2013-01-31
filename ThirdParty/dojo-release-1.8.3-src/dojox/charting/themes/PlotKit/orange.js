define(["./base", "../../Theme"], function(pk, Theme){
	pk.orange = pk.base.clone();
	pk.orange.chart.fill = pk.orange.plotarea.fill = "#f5eee6";
	pk.orange.colors = Theme.defineColors({hue: 31, saturation: 60, low: 40, high: 88});
	
	return pk.orange;
});
