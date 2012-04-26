/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.Printer"]){
dojo._hasResource["dojox.grid.enhanced.plugins.Printer"]=true;
dojo.provide("dojox.grid.enhanced.plugins.Printer");
dojo.require("dojox.grid.enhanced._Plugin");
dojo.require("dojox.grid.enhanced.plugins.exporter.TableWriter");
dojo.declare("dojox.grid.enhanced.plugins.Printer",dojox.grid.enhanced._Plugin,{name:"printer",constructor:function(_1){
this.grid=_1;
this._mixinGrid(_1);
_1.setExportFormatter(function(_2,_3,_4,_5){
return _3.format(_4,_5);
});
},_mixinGrid:function(){
var g=this.grid;
g.printGrid=dojo.hitch(this,this.printGrid);
g.printSelected=dojo.hitch(this,this.printSelected);
g.exportToHTML=dojo.hitch(this,this.exportToHTML);
g.exportSelectedToHTML=dojo.hitch(this,this.exportSelectedToHTML);
g.normalizePrintedGrid=dojo.hitch(this,this.normalizeRowHeight);
},printGrid:function(_6){
this.exportToHTML(_6,dojo.hitch(this,this._print));
},printSelected:function(_7){
this._print(this.exportSelectedToHTML(_7));
},exportToHTML:function(_8,_9){
_8=this._formalizeArgs(_8);
var _a=this;
this.grid.exportGrid("table",_8,function(_b){
_9(_a._wrapHTML(_8.title,_8.cssFiles,_8.titleInBody+_b));
});
},exportSelectedToHTML:function(_c){
_c=this._formalizeArgs(_c);
var _d=this.grid.exportSelected("table",_c.writerArgs);
return this._wrapHTML(_c.title,_c.cssFiles,_c.titleInBody+_d);
},_print:function(_e){
var _f,_10=this,_11=function(w){
var doc=_f.document;
doc.open();
doc.write(_e);
doc.close();
_10.normalizeRowHeight(doc);
};
if(!window.print){
return;
}else{
if(dojo.isChrome||dojo.isOpera){
_f=window.open("javascript: ''","","status=0,menubar=0,location=0,toolbar=0,width=1,height=1,resizable=0,scrollbars=0");
_11(_f);
_f.print();
_f.close();
}else{
var fn=this._printFrame,dn=this.grid.domNode;
if(!fn){
var _12=dn.id+"_print_frame";
if(!(fn=dojo.byId(_12))){
fn=dojo.create("iframe");
fn.id=_12;
fn.frameBorder=0;
dojo.style(fn,{width:"1px",height:"1px",position:"absolute",right:0,bottoom:0,border:"none",overflow:"hidden"});
if(!dojo.isIE){
dojo.style(fn,"visibility","hidden");
}
dn.appendChild(fn);
}
this._printFrame=fn;
}
_f=fn.contentWindow;
_11(_f);
dijit.focus(fn);
_f.print();
}
}
},_wrapHTML:function(_13,_14,_15){
var _16=["<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01 Transitional//EN\" \"http://www.w3.org/TR/html4/loose.dtd\">","<html><head><title>",_13,"</title><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></meta>"];
for(var i=0;i<_14.length;++i){
_16.push("<link rel=\"stylesheet\" type=\"text/css\" href=\""+_14[i]+"\" />");
}
_16.push("</head>");
if(_15.search(/^\s*<body/i)<0){
_15="<body>"+_15+"</body>";
}
_16.push(_15);
return _16.join("\n");
},normalizeRowHeight:function(doc){
var _17=dojo.query("table.grid_view",doc.body);
var _18=dojo.map(_17,function(_19){
return dojo.query("thead.grid_header",_19)[0];
});
var _1a=dojo.map(_17,function(_1b){
return dojo.query("tbody.grid_row",_1b);
});
var _1c=_1a[0].length;
var i,v,h,_1d=0;
for(v=_17.length-1;v>=0;--v){
h=dojo.contentBox(_18[v]).h;
if(h>_1d){
_1d=h;
}
}
for(v=_17.length-1;v>=0;--v){
dojo.style(_18[v],"height",_1d+"px");
}
for(i=0;i<_1c;++i){
_1d=0;
for(v=_17.length-1;v>=0;--v){
h=dojo.contentBox(_1a[v][i]).h;
if(h>_1d){
_1d=h;
}
}
for(v=_17.length-1;v>=0;--v){
dojo.style(_1a[v][i],"height",_1d+"px");
}
}
var _1e=0;
for(v=0;v<_17.length;++v){
dojo.style(_17[v],"left",_1e+"px");
_1e+=dojo.marginBox(_17[v]).w;
}
},_formalizeArgs:function(_1f){
_1f=(_1f&&dojo.isObject(_1f))?_1f:{};
_1f.title=String(_1f.title)||"";
if(!dojo.isArray(_1f.cssFiles)){
_1f.cssFiles=[_1f.cssFiles];
}
_1f.titleInBody=_1f.title?["<h1>",_1f.title,"</h1>"].join(""):"";
return _1f;
}});
dojox.grid.EnhancedGrid.registerPlugin(dojox.grid.enhanced.plugins.Printer,{"dependency":["exporter"]});
}
