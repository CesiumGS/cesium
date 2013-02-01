define(["dojo/_base/lang","./matrix","./vector"], 
	function(lang,m,v){

	var gfx3d = lang.getObject("dojox.gfx3d",true);

	var dist = function(a, b){ return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)); };
	var N = 32;

	gfx3d.gradient = function(model, material, center, radius, from, to, matrix){
		// summary:
		//		calculate a cylindrical gradient
		// model: dojox.gfx3d.lighting.Model
		//		color model
		// material: Object
		//		defines visual properties
		// center: Object
		//		center of the cylinder's bottom
		// radius: Number
		//		radius of the cylinder
		// from: Number
		//		from position in radians
		// to: Number
		//		from position in radians
		// matrix: dojox.gfx3d.Matrix3D
		//		the cumulative transformation matrix
		// tolerance: Number
		//		tolerable difference in colors between gradient steps

		var mx = m.normalize(matrix),
			f = m.multiplyPoint(mx, radius * Math.cos(from) + center.x, radius * Math.sin(from) + center.y, center.z),
			t = m.multiplyPoint(mx, radius * Math.cos(to)   + center.x, radius * Math.sin(to)   + center.y, center.z),
			c = m.multiplyPoint(mx, center.x, center.y, center.z), step = (to - from) / N, r = dist(f, t) / 2,
			mod = model[material.type], fin = material.finish, pmt = material.color,
			colors = [{offset: 0, color: mod.call(model, v.substract(f, c), fin, pmt)}];

		for(var a = from + step; a < to; a += step){
			var p = m.multiplyPoint(mx, radius * Math.cos(a) + center.x, radius * Math.sin(a) + center.y, center.z),
				df = dist(f, p), dt = dist(t, p);
			colors.push({offset: df / (df + dt), color: mod.call(model, v.substract(p, c), fin, pmt)});
		}
		colors.push({offset: 1, color: mod.call(model, v.substract(t, c), fin, pmt)});

		return {type: "linear", x1: 0, y1: -r, x2: 0, y2: r, colors: colors};
	};

	return gfx3d.gradient;
});