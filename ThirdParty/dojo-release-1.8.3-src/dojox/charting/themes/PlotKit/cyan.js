define(["./base", "../../Theme"], function(pk, Theme){
	pk.cyan = pk.base.clone();
	pk.cyan.chart.fill = pk.cyan.plotarea.fill = "#e6f1f5";
	pk.cyan.colors = Theme.defineColors({hue: 194, saturation: 60, low: 40, high: 88});
	
	return pk.cyan;
});
