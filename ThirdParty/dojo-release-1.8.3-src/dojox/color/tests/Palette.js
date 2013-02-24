dojo.provide("dojox.color.tests.Palette");
dojo.require("dojox.color.Palette");

var __p__, palette=function(){
	if(__p__) return __p__;
	__p__=document.createElement("div");
	var s=__p__.style;
	s.overflow="auto";
	s.padding="0 6px";
	//	drop it in the test thing
	var body=dojo.query("#testListContainer table tbody")[0];
	if(body){
		var tr=document.createElement("tr");
		var td=document.createElement("td");
		td.colSpan=4;
		td.appendChild(__p__);
		tr.appendChild(td);
		body.appendChild(tr);
	}
	return __p__;
}

var p = new dojox.color.Palette([
	"#ff0000",
	"#ffff00",
	"#ff00ff",
	"#00ffff",
	"#0000ff"
]);

function displayIt(pal, title){
	var s='<h3>'+title+'</h3><table cellpadding="0" cellspacing="1" border="0"><tr>';
	var cols=5, c=0;
	dojo.forEach(pal.colors, function(item){
		s+='<td width="32" bgcolor="'+item.toHex()+'">&nbsp;</td>';
		console.log("item color is ", item.toHex());
	});
	palette().innerHTML += s + "</tr></table>";
}

tests.register("dojox.color.tests.Palette", [
	function testPalette(t){
		var p = new dojox.color.Palette([
			"#000000",
			"#333333",
			"#666666",
			"#999999",
			"#cccccc"
		]);
		displayIt(p, "dojox.color.Palette");
	},

	function testTransform(t){
		displayIt(p, "Transform: initial palette");
		var trans = p.transform({
			use: "hsv",
			dh: 120,
			dv: -40
		});
		displayIt(trans, "Transform dh:+120, dv: -40");

		trans = p.transform({
			use: "cmyk",
			dc: 30,
			dk: 30
		});
		displayIt(trans, "Transform using CMYK dc:+30, dk: +30");

		trans = p.transform({
			use: "rgba",
			db: -100
		});
		displayIt(trans, "Transform using RGB db:-100");
	},

	function testGenerators(t){
		var base = "#ff0000";
		displayIt(dojox.color.Palette.generate(base, "analogous"), "Generated analogous palette");
		displayIt(dojox.color.Palette.generate(base, "monochromatic"), "Generated monochromatic palette");
		displayIt(dojox.color.Palette.generate(base, "triadic"), "Generated triadic palette");
		displayIt(dojox.color.Palette.generate(base, "complementary"), "Generated complementary palette");
		displayIt(dojox.color.Palette.generate(base, "splitComplementary"), "Generated splitComplementary palette");
		displayIt(dojox.color.Palette.generate(base, "compound"), "Generated compound palette");
		displayIt(dojox.color.Palette.generate(base, "shades"), "Generated shades palette");
	}
]);
