define(["./base", "../../Theme"], function(pk, Theme){
	pk.green = pk.base.clone();
	pk.green.chart.fill = pk.green.plotarea.fill = "#eff5e6";
	pk.green.colors = Theme.defineColors({hue: 82, saturation: 60, low: 40, high: 88});
	
	return pk.green;
});
