/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.cldr.supplemental"]){
dojo._hasResource["dojo.cldr.supplemental"]=true;
dojo.provide("dojo.cldr.supplemental");
dojo.require("dojo.i18n");
dojo.getObject("cldr.supplemental",true,dojo);
dojo.cldr.supplemental.getFirstDayOfWeek=function(_1){
var _2={mv:5,ae:6,af:6,bh:6,dj:6,dz:6,eg:6,er:6,et:6,iq:6,ir:6,jo:6,ke:6,kw:6,ly:6,ma:6,om:6,qa:6,sa:6,sd:6,so:6,sy:6,tn:6,ye:6,ar:0,as:0,az:0,bw:0,ca:0,cn:0,fo:0,ge:0,gl:0,gu:0,hk:0,il:0,"in":0,jm:0,jp:0,kg:0,kr:0,la:0,mh:0,mn:0,mo:0,mp:0,mt:0,nz:0,ph:0,pk:0,sg:0,th:0,tt:0,tw:0,um:0,us:0,uz:0,vi:0,zw:0};
var _3=dojo.cldr.supplemental._region(_1);
var _4=_2[_3];
return (_4===undefined)?1:_4;
};
dojo.cldr.supplemental._region=function(_5){
_5=dojo.i18n.normalizeLocale(_5);
var _6=_5.split("-");
var _7=_6[1];
if(!_7){
_7={de:"de",en:"us",es:"es",fi:"fi",fr:"fr",he:"il",hu:"hu",it:"it",ja:"jp",ko:"kr",nl:"nl",pt:"br",sv:"se",zh:"cn"}[_6[0]];
}else{
if(_7.length==4){
_7=_6[2];
}
}
return _7;
};
dojo.cldr.supplemental.getWeekend=function(_8){
var _9={"in":0,af:4,dz:4,ir:4,om:4,sa:4,ye:4,ae:5,bh:5,eg:5,il:5,iq:5,jo:5,kw:5,ly:5,ma:5,qa:5,sd:5,sy:5,tn:5};
var _a={af:5,dz:5,ir:5,om:5,sa:5,ye:5,ae:6,bh:5,eg:6,il:6,iq:6,jo:6,kw:6,ly:6,ma:6,qa:6,sd:6,sy:6,tn:6};
var _b=dojo.cldr.supplemental._region(_8);
var _c=_9[_b];
var _d=_a[_b];
if(_c===undefined){
_c=6;
}
if(_d===undefined){
_d=0;
}
return {start:_c,end:_d};
};
}
