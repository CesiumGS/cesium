define([
	"dojo/_base/lang",
	"dojo/_base/Color",	// dojo.Color
	"dojo/_base/declare",	// declare
	"dojox/gfx/_base",
	"./_base"
],function(lang,Color,declare,gfx,gfx3d) {

	var lite = gfx3d.lighting = {
		// color utilities
		black: function(){
			return {r: 0, g: 0, b: 0, a: 1};
		},
		white: function(){
			return {r: 1, g: 1, b: 1, a: 1};
		},
		toStdColor: function(c){
			c = gfx.normalizeColor(c);
			return {r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a};
		},
		fromStdColor: function(c){
			return new Color([Math.round(255 * c.r), Math.round(255 * c.g), Math.round(255 * c.b), c.a]);
		},
		scaleColor: function(s, c){
			return {r: s * c.r, g: s * c.g, b: s * c.b, a: s * c.a};
		},
		addColor: function(a, b){
			return {r: a.r + b.r, g: a.g + b.g, b: a.b + b.b, a: a.a + b.a};
		},
		multiplyColor: function(a, b){
			return {r: a.r * b.r, g: a.g * b.g, b: a.b * b.b, a: a.a * b.a};
		},
		saturateColor: function(c){
			return {
				r: c.r < 0 ? 0 : c.r > 1 ? 1 : c.r,
				g: c.g < 0 ? 0 : c.g > 1 ? 1 : c.g,
				b: c.b < 0 ? 0 : c.b > 1 ? 1 : c.b,
				a: c.a < 0 ? 0 : c.a > 1 ? 1 : c.a
			};
		},
		mixColor: function(c1, c2, s){
			return lite.addColor(lite.scaleColor(s, c1), lite.scaleColor(1 - s, c2));
		},
		diff2Color: function(c1, c2){
			var r = c1.r - c2.r;
			var g = c1.g - c2.g;
			var b = c1.b - c2.b;
			var a = c1.a - c2.a;
			return r * r + g * g + b * b + a * a;
		},
		length2Color: function(c){
			return c.r * c.r + c.g * c.g + c.b * c.b + c.a * c.a;
		},
		
		// vector utilities
		//TODO: move vector utilities from this file to vector.js
		dot: function(a, b){
			return a.x * b.x + a.y * b.y + a.z * b.z;
		},
		scale: function(s, v){
			return {x: s * v.x, y: s * v.y, z: s * v.z};
		},
		add: function(a, b){
			return {x: a.x + b.x, y: a.y + b.y, z: a.z + b.z};
		},
		saturate: function(v){
			return Math.min(Math.max(v, 0), 1);
		},
		length: function(v){
			return Math.sqrt(gfx3d.lighting.dot(v, v));
		},
		normalize: function(v){
			return lite.scale(1 / lite.length(v), v);
		},
		faceforward: function(n, i){
			var p = gfx3d.lighting;
			var s = p.dot(i, n) < 0 ? 1 : -1;
			return p.scale(s, n);
		},
		reflect: function(i, n){
			var p = gfx3d.lighting;
			return p.add(i, p.scale(-2 * p.dot(i, n), n));
		},
		
		// lighting utilities
		diffuse: function(normal, lights){
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					d = lite.dot(lite.normalize(l.direction), normal);
				c = lite.addColor(c, lite.scaleColor(d, l.color));
			}
			return lite.saturateColor(c);
		},
		specular: function(normal, v, roughness, lights){
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					h = lite.normalize(lite.add(lite.normalize(l.direction), v)),
					s = Math.pow(Math.max(0, lite.dot(normal, h)), 1 / roughness);
				c = lite.addColor(c, lite.scaleColor(s, l.color));
			}
			return lite.saturateColor(c);
		},
		phong: function(normal, v, size, lights){
			normal = lite.normalize(normal);
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					r = lite.reflect(lite.scale(-1, lite.normalize(v)), normal),
					s = Math.pow(Math.max(0, lite.dot(r, lite.normalize(l.direction))), size);
				c = lite.addColor(c, lite.scaleColor(s, l.color));
			}
			return lite.saturateColor(c);
		}
	};

	// this lighting model is derived from RenderMan Interface Specification Version 3.2

	declare("dojox.gfx3d.lighting.Model", null, {
		constructor: function(incident, lights, ambient, specular){
			this.incident = lite.normalize(incident);
			this.lights = [];
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i];
				this.lights.push({direction: lite.normalize(l.direction), color: lite.toStdColor(l.color)});
			}
			this.ambient = lite.toStdColor(ambient.color ? ambient.color : "white");
			this.ambient = lite.scaleColor(ambient.intensity, this.ambient);
			this.ambient = lite.scaleColor(this.ambient.a, this.ambient);
			this.ambient.a = 1;
			this.specular = lite.toStdColor(specular ? specular : "white");
			this.specular = lite.scaleColor(this.specular.a, this.specular);
			this.specular.a = 1;
			this.npr_cool = {r: 0,   g: 0,   b: 0.4, a: 1};
			this.npr_warm = {r: 0.4, g: 0.4, b: 0.2, a: 1};
			this.npr_alpha = 0.2;
			this.npr_beta  = 0.6;
			this.npr_scale = 0.6;
		},
		constant: function(normal, finish, pigment){
			pigment   = lite.toStdColor(pigment);
			var alpha = pigment.a, color = lite.scaleColor(alpha, pigment);
			color.a   = alpha;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		matte: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights)),
				color   = lite.scaleColor(pigment.a, lite.multiplyColor(pigment, lite.addColor(ambient, diffuse)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		metal: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var v = lite.scale(-1, this.incident), specular, color,
				ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident));
			if("phong" in finish){
				specular = lite.scaleColor(shadow * finish.Ks * finish.phong, lite.phong(normal, v, finish.phong_size, this.lights));
			}else{
				specular = lite.scaleColor(shadow * finish.Ks, lite.specular(normal, v, finish.roughness, this.lights));
			}
			color = lite.scaleColor(pigment.a, lite.addColor(lite.multiplyColor(pigment, ambient), lite.multiplyColor(this.specular, specular)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		plastic: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var v = lite.scale(-1, this.incident), specular, color,
				ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights));
			if("phong" in finish){
				specular = lite.scaleColor(shadow * finish.Ks * finish.phong, lite.phong(normal, v, finish.phong_size, this.lights));
			}else{
				specular = lite.scaleColor(shadow * finish.Ks, lite.specular(normal, v, finish.roughness, this.lights));
			}
			color = lite.scaleColor(pigment.a, lite.addColor(lite.multiplyColor(pigment, lite.addColor(ambient, diffuse)), lite.multiplyColor(this.specular, specular)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		npr: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var ambient  = lite.scaleColor(finish.Ka, this.ambient),
				shadow   = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse  = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights)),
				color = lite.scaleColor(pigment.a, lite.multiplyColor(pigment, lite.addColor(ambient, diffuse))),
				cool = lite.addColor(this.npr_cool, lite.scaleColor(this.npr_alpha, color)),
				warm = lite.addColor(this.npr_warm, lite.scaleColor(this.npr_beta,  color)),
				d = (1 + lite.dot(this.incident, normal)) / 2,
				color = lite.scaleColor(this.npr_scale, lite.addColor(color, lite.mixColor(cool, warm, d)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		}
	});


	// POV-Ray basic finishes
	
	gfx3d.lighting.finish = {
	
		// Default
		
		defaults: {Ka: 0.1, Kd: 0.6, Ks: 0.0, roughness: 0.05},
		
		dull:     {Ka: 0.1, Kd: 0.6, Ks: 0.5, roughness: 0.15},
		shiny:    {Ka: 0.1, Kd: 0.6, Ks: 1.0, roughness: 0.001},
		glossy:   {Ka: 0.1, Kd: 0.6, Ks: 1.0, roughness: 0.0001},
		
		phong_dull:   {Ka: 0.1, Kd: 0.6, Ks: 0.5, phong: 0.5, phong_size: 1},
		phong_shiny:  {Ka: 0.1, Kd: 0.6, Ks: 1.0, phong: 1.0, phong_size: 200},
		phong_glossy: {Ka: 0.1, Kd: 0.6, Ks: 1.0, phong: 1.0, phong_size: 300},
	
		luminous: {Ka: 1.0, Kd: 0.0, Ks: 0.0, roughness: 0.05},
	
		// Metals
	
		// very soft and dull
		metalA: {Ka: 0.35, Kd: 0.3, Ks: 0.8, roughness: 1/20},
		// fairly soft and dull
		metalB: {Ka: 0.30, Kd: 0.4, Ks: 0.7, roughness: 1/60},
		// medium reflectivity, holds color well
		metalC: {Ka: 0.25, Kd: 0.5, Ks: 0.8, roughness: 1/80},
		// highly hard and polished, high reflectivity
		metalD: {Ka: 0.15, Kd: 0.6, Ks: 0.8, roughness: 1/100},
		// very highly polished and reflective
		metalE: {Ka: 0.10, Kd: 0.7, Ks: 0.8, roughness: 1/120}
	};

	return lite;
});
