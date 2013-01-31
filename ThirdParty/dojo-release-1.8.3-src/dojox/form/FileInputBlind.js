define([
	"dojo/_base/lang",
	"dojox/form/FileInputAuto"
], function(lang, FileInputAuto){
// TODO: break out code in 2.0. Leave this stub in place until then. Leave FileInputBlind code in Auto.js for
// backwards compatibility.
	lang.setObject("dojox.form.FileInputBlind", FileInputAuto);
	return FileInputAuto;
});