define([
		"dojo/_base/lang", 
		"dojo/_base/declare", 
		"dojo/_base/Color", 
		"../../CircularGauge", 
		"../../LinearScaler", 
		"../../CircularScale", 
		"../../CircularValueIndicator", 
		"../../CircularRangeIndicator",
		"../DefaultPropertiesMixin"
	], 
	function(lang, declare, Color, CircularGauge, LinearScaler, CircularScale, CircularValueIndicator, CircularRangeIndicator, DefaultPropertiesMixin){
		return declare("dojox.dgauges.components.black.CircularLinearGauge", [CircularGauge, DefaultPropertiesMixin], {
			// summary:
			//		A circular gauge widget.

			// borderColor: Object|Array|int
			//		The border color. Default is "#000000".
			borderColor: "#000000",
			// fillColor: Object|Array|int
			//		The background color. Default is "#000000".
			fillColor: "#000000",
			// indicatorColor: Object|Array|int
			//		The indicator fill color. Default is "#A4A4A4".
			indicatorColor: "#A4A4A4",
			constructor: function(){
				// Base colors
				this.borderColor = new Color(this.borderColor);
				this.fillColor = new Color(this.fillColor);
				this.indicatorColor = new Color(this.indicatorColor);
				
				var scaler = new LinearScaler();
				this.addElement("background", lang.hitch(this, this.drawBackground));
				var scale = new CircularScale();
				scale.set("scaler", scaler);
				scale.set("radius", 149.82183);
				scale.set("originX", 186.9446);
				scale.set("originY", 184.74838);
				scale.set("startAngle", 130.16044);
				scale.set("endAngle", 50.25444);
				scale.set("orientation", "clockwise");
				scale.set("labelGap", 8);
				scale.set("font", {
					family: "Helvetica",
					weight: "bold",
					size: "14pt",
					color: "#CECECE"
				});
				scale.set("tickShapeFunc", function(group, scale, tick){
					return group.createCircle({
						r: tick.isMinor ? 2 : 4
					}).setFill("#CECECE");
				});
				this.addElement("scale", scale);
				var indicator = new CircularValueIndicator();
				indicator.set("interactionArea", "gauge");
				indicator.set("value", scaler.minimum);
				indicator.set("indicatorShapeFunc", lang.hitch(this, function(group, indicator){
					
					return group.createPolyline([0, -12, indicator.scale.radius - 2, 0, 0, 12, 0, -12]).setStroke({
						color: [70, 70, 70],
						width: 1
					}).setFill(this.indicatorColor);

				}));
				scale.addIndicator("indicator", indicator);
				this.addElement("foreground", lang.hitch(this, this.drawForeground));
			},
			drawBackground: function(g){
				// summary:
				//		Draws the background shape of the gauge.
				// g: dojox/gfx/Group
				//		The group used to draw the background. 
				// tags:
				//		protected
				g.createPath({
					path: "M372.9962 186.58 C373.0312 289.5712 289.57 373.0888 186.5787 373.1237 C83.5887 373.16 0.07 289.6975 0.035 186.7062 L0.035 186.58 C-0 83.5888 83.4625 0.0712 186.4524 0.0362 C289.4425 -0 372.9611 83.4625 372.9962 186.4525 L372.9962 186.58 Z"
				}).setFill(this.borderColor);
				g.createPath({
					path: "M358.7902 186.5795 C358.8253 281.7258 281.7202 358.8808 186.574 358.9145 C91.4277 358.9471 14.2715 281.842 14.239 186.6957 L14.239 186.5795 C14.2077 91.4332 91.3127 14.2782 186.4565 14.2445 C281.6027 14.2132 358.759 91.317 358.7902 186.4633 L358.7902 186.5795 Z"
				}).setFill({
					type: "linear",
					x1: 14.23897,
					y1: 358.91452,
					x2: 14.23897,
					y2: 221.04652,
					colors: [
						{offset: 0, color: [100,100,100]},
						{offset: 1, color: this.fillColor}
					]
				});
				g.createPath({
					path: "M358.749 182.9033 C356.8202 89.4033 280.4165 14.2132 186.4615 14.2445 C92.5465 14.277 16.2165 89.4533 14.289 182.9008 C66.884 197.0646 127.4052 168.8146 188.7977 168.8146 C250.209 168.8146 306.3027 197.0708 358.749 182.9033"
				}).setFill({
					type: "linear",
					x1: 14.28899,
					y1: 186.87839,
					x2: 14.28899,
					y2: 14.24451,
					colors: [
						{offset: 0, color: this.fillColor},
						{offset: 1, color: [200,200,200]}
					]
				});
				g.createPath({
					path: "M358.7457 182.9033 C356.817 89.4033 280.4132 14.2133 186.4582 14.2445 C92.5432 14.277 16.2132 89.4533 14.2857 182.9008 C66.8807 197.0646 127.402 168.8146 188.7945 168.8146 C250.2057 168.8146 306.2995 197.0708 358.7457 182.9033"
				}).setFill([255,255,255,0.12157]);
			},

			drawForeground: function(g){
				// summary:
				//		Draws the foreground shape of the gauge.
				// g: dojox/gfx/Group
				//		The group used to draw the foreground. 
				// tags:
				//		protected
				var g1 = g.createGroup();
				g1.createPath({
					path: "M214.9859 185.33 C214.9909 201.0537 202.2496 213.8037 186.5259 213.81 C170.7996 213.815 158.0496 201.0725 158.0446 185.35 L158.0446 185.33 C158.0384 169.6062 170.7821 156.8562 186.5071 156.85 C202.2296 156.845 214.9809 169.5875 214.9859 185.3113 L214.9859 185.33 Z"
				}).setFill(this.borderColor);
				g1.createPath({
					path: "M211.4015 185.3295 C211.4052 199.0745 200.2689 210.2183 186.524 210.2232 C172.7802 210.2282 161.6352 199.0908 161.6302 185.347 L161.6302 185.3295 C161.6252 171.5858 172.7628 160.4408 186.5065 160.4358 C200.2515 160.4308 211.3965 171.5695 211.4015 185.3133 L211.4015 185.3295 Z"
				}).setFill({
					type: "linear",
					x1: 161.63024,
					y1: 210.22326,
					x2: 161.63024,
					y2: 185.32952,
					colors: [
						{offset: 0, color: [100,100,100]},
						{offset: 1, color: this.fillColor}
					]
				});
				g1.createPath({
					path: "M211.3952 184.7995 C211.1165 171.2933 200.0802 160.4308 186.5077 160.4358 C172.9415 160.4408 161.9152 171.2995 161.6377 184.7995 C169.234 186.8446 177.9752 182.7645 186.8465 182.7645 C195.7165 182.7645 203.819 186.8458 211.3952 184.7995"
				}).setFill({
					type: "linear",
					x1: 161.63772,
					y1: 185.37364,
					x2: 161.63772,
					y2: 160.43577,
					colors: [
						{offset: 0, color: this.fillColor},
						{offset: 1, color: [150,150,150]}
					]
				});
				g1.createPath({
					path: "M211.3946 184.799 C211.1158 171.2928 200.0796 160.4315 186.5084 160.4365 C172.9409 160.4415 161.9159 171.3003 161.6371 184.799 C169.2334 186.844 177.9759 182.764 186.8458 182.764 C195.7158 182.764 203.8184 186.8465 211.3946 184.799"
				}).setFill([255,255,255,0.12157]);
			}
		});
	}
);

