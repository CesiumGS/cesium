define(["doh", "dojo/_base/declare", "../MeanColorModel", "..", "dijit/_WidgetBase"], 
	function(doh, declare, MeanColorModel, color, _WidgetBase){
	doh.register("tests.MeanColorModel", [
		function test_Values(t){
			var cm = new MeanColorModel(new color.Color([0, 0, 0]), new color.Color([100, 100, 100]));
			cm.initialize([0, 10, 20], function(item){
				return item;
			});
			t.is([50, 50, 50], cm.getColor(10).toRgb());
			t.is([0, 0, 0], cm.getColor(0).toRgb());
			t.is([99, 99, 99], cm.getColor(20).toRgb());
			
			cm.initialize([0, 5, 20], function(item){
				return item;
			});
			t.is([50, 50, 50], cm.getColor(5).toRgb());
			t.is([0, 0, 0], cm.getColor(0).toRgb());
			t.is([99, 99, 99], cm.getColor(20).toRgb());

		}
	]);
});
