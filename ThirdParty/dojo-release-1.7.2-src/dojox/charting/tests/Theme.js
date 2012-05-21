dojo.provide("dojox.charting.tests.Theme");
dojo.require("dojox.charting.Theme");
dojo.require("dojox.charting.themes.PlotKit.blue");

(function(){
	var dxc=dojox.charting, Theme = dxc.Theme;
	var blue=dxc.themes.PlotKit.blue;
	tests.register("dojox.charting.tests.Theme", [
		function testDefineColor(t){
			var args={ num:16, cache:false };
			Theme.defineColors(args);
			var a=blue.colors;
			var s="<table border=1>";
			for(var i=0; i<a.length; i++){
				if(i%8==0){
					if(i>0) s+="</tr>";
					s+="<tr>";
				}
				s+='<td width=16 bgcolor='+a[i]+'>&nbsp;</td>';
			}
			s+="</tr></table>";
			doh.debug(s);

			var args={ num:32, cache: false };
			Theme.defineColors(args);
			var a=blue.colors;
			var s="<table border=1 style=margin-top:12px;>";
			for(var i=0; i<a.length; i++){
				if(i%8==0){
					if(i>0) s+="</tr>";
					s+="<tr>";
				}
				s+='<td width=16 bgcolor='+a[i]+'>&nbsp;</td>';
			}
			s+="</tr></table>";
			doh.debug(s);

			var args={ saturation:20, num:32, cache:false };
			Theme.defineColors(args);
			var a=blue.colors;
			var s="<table border=1 style=margin-top:12px;>";
			for(var i=0; i<a.length; i++){
				if(i%8==0){
					if(i>0) s+="</tr>";
					s+="<tr>";
				}
				s+='<td width=16 bgcolor='+a[i]+'>&nbsp;</td>';
			}
			s+="</tr></table>";
			doh.debug(s);

			var args={ low:10, high:90, num:32, cache: false };
			Theme.defineColors(args);
			var a=blue.colors;
			var s="<table border=1 style=margin-top:12px;>";
			for(var i=0; i<a.length; i++){
				if(i%8==0){
					if(i>0) s+="</tr>";
					s+="<tr>";
				}
				s+='<td width=16 bgcolor='+a[i]+'>&nbsp;</td>';
			}
			s+="</tr></table>";
			doh.debug(s);
		}
	]);
})();
