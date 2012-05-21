define(["dojo/_base/kernel", "dojo/_base/declare"], function(dojo, declare){
	return declare("dojox.geo.openlayers.tests.sun.Sun", null, {
		_now : false,

		constructor : function(d){
			if (!d)
				d = new Date();
			this._date = d;
		},

		getDate : function(){
			var d = this._date;
			if (d == null) {
				d = new Date();
				this._date = d;
			}
			return d;
		},

		setDate : function(d){
			if (!d)
				d = new Date();
			this._date = d;
		},

		isNow : function(){
			return this._now;
		},

		clip : function(p, c){
			if (p.x < c.x1)
				p.x = c.x1;
			if (p.y < c.y2)
				p.y = c.y2;
			if (p.x > c.x2)
				p.x = c.x2;
			if (p.y > c.y1)
				p.y = c.y1;
			return p;
		},

		twilightZone : function(c){
			var pts = [];

			clip = function(p, c){
				if (p.x < c.x1)
					p.x = c.x1;
				if (p.y < c.y2)
					p.y = c.y2;
				if (p.x > c.x2)
					p.x = c.x2;
				if (p.y > c.y1)
					p.y = c.y1;
				return p;
			};

			addPoint = function(p){
				if (c)
					p = this.clip(p, c);
				pts.push(p);
			};

			sLon = -180;
			sLat = -90;
			eLon = 180;
			eLat = 90;
			if (c) {
				if (sLon < c.x1)
					sLon = c.x1;
				if (sLat < c.y2)
					sLat = c.y2;
				if (eLon > c.x2)
					eLon = c.x2;
				if (eLat > c.y1)
					eLat = c.y1;
			}
			var dt = this.getDate();
			var LT = dt.getUTCHours() + dt.getUTCMinutes() / 60 + dt.getUTCSeconds() / 3600;
			var tau = 15 * (LT - 12);
			var o = this.sunDecRa();
			var dec = o.dec;
			var incr = 1;
			var dtr = Math.PI / 180;
			for ( var i = sLon; i <= eLon; i += incr) {
				var longitude = i + tau;
				var tanLat = -Math.cos(longitude * dtr) / Math.tan(dec * dtr);
				var arctanLat = Math.atan(tanLat) / dtr;
				addPoint({
					x : i,
					y : arctanLat
				});
			}

			if (dec < 0) {
				addPoint({
					x : 180,
					y : -85
				});

				addPoint({
					x : -180,
					y : -85
				});

				addPoint({
					x : pts[0].x,
					y : pts[0].y
				});

			} else {
				addPoint({
					x : 180,
					y : 85
				});

				addPoint({
					x : -180,
					y : 85
				});

			}
			return pts;
		},

		sun : function(){
			var o = this.sunDecRa();
			var dec = o.dec;
			var dt = this.getDate();
			var LT = dt.getUTCHours() + dt.getUTCMinutes() / 60 + dt.getUTCSeconds() / 3600;
			var tau = 15 * (LT - 12);
			var et = 0; // this.et(dt) / 60;
			var p = {
				x : -tau + et,
				y : dec
			};
			return p;
		},

		jd : function(date){
			var dt;
			if (date != null)
				dt = date;
			else
				dt = this.getDate();
			MM = dt.getMonth() + 1;
			DD = dt.getDate();
			YY = dt.getFullYear();
			HR = dt.getUTCHours();
			MN = dt.getUTCMinutes();
			SC = 0;
			with (Math) {
				HR = HR + (MN / 60) + (SC / 3600);
				GGG = 1;
				if (YY <= 1585)
					GGG = 0;
				JD = -1 * floor(7 * (floor((MM + 9) / 12) + YY) / 4);
				S = 1;
				if ((MM - 9) < 0)
					S = -1;
				A = abs(MM - 9);
				J1 = floor(YY + S * floor(A / 7));
				J1 = -1 * floor((floor(J1 / 100) + 1) * 3 / 4);
				JD = JD + floor(275 * MM / 9) + DD + (GGG * J1);
				JD = JD + 1721027 + 2 * GGG + 367 * YY - 0.5;
				JD = JD + (HR / 24);
			}
			return JD;
		},

		sunDecRa : function(){
			var jd = this.jd();
			var PI2 = 2.0 * Math.PI;
			var cos_eps = 0.917482;
			var sin_eps = 0.397778;
			var M, DL, L, SL, X, Y, Z, R;
			var T, dec, ra;
			T = (jd - 2451545.0) / 36525.0; // number of Julian centuries since Jan 1,
			// 2000, 0 GMT
			M = PI2 * this.frac(0.993133 + 99.997361 * T);
			DL = 6893.0 * Math.sin(M) + 72.0 * Math.sin(2.0 * M);
			L = PI2 * this.frac(0.7859453 + M / PI2 + (6191.2 * T + DL) / 1296000);
			SL = Math.sin(L);
			X = Math.cos(L);
			Y = cos_eps * SL;
			Z = sin_eps * SL;
			R = Math.sqrt(1.0 - Z * Z);
			dec = (360.0 / PI2) * Math.atan(Z / R);
			ra = (48.0 / PI2) * Math.atan(Y / (X + R));
			if (ra < 0)
				ra = ra + 24.0;
			return {
				dec : dec,
				ra : ra
			};
		},

		et : function(d){
			if (!d)
				d = this.getDate();
			var year = date.getUTCFullYear();
			var month = date.getUTCMonth() + 1;
			var day = date.getUTCDate();

			var N1 = Math.floor((month * 275) / 9);
			var N2 = Math.floor((month + 9) / 12);
			var K = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3);
			var j = N1 - N2 * K + day - 30;

			var M = 357 + 0.9856 * j;
			var C = 1.914 * Math.sin(M) + 0.02 * Math.sin(2 * M);
			var L = 280 + C + 0.9856 * j;
			var R = -2.465 * Math.sin(2 * L) + 0.053 * Math.sin(4 * L);

			var ET = (C + R) * 4;

			return ET;
		},

		frac : function(x){
			x = x - Math.floor(x);
			if (x < 0)
				x = x + 1.0;
			return x;
		}
	});
});
