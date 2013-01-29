define(["./base", "../../Theme"], function(pk, Theme){
	pk.purple = pk.base.clone();
	pk.purple.chart.fill = pk.purple.plotarea.fill = "#eee6f5";
	pk.purple.colors = Theme.defineColors({hue: 271, saturation: 60, low: 40, high: 88});
	
	return pk.purple;
});
