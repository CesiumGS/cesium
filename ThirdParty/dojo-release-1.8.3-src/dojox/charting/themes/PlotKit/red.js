define(["./base", "../../Theme"], function(pk, Theme){
	pk.red = pk.base.clone();
	pk.red.chart.fill = pk.red.plotarea.fill = "#f5e6e6";
	pk.red.colors = Theme.defineColors({hue: 1, saturation: 60, low: 40, high: 88});
	
	return pk.red;
});
