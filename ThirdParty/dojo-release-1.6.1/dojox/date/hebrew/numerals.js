/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.hebrew.numerals"]){
dojo._hasResource["dojox.date.hebrew.numerals"]=true;
dojo.provide("dojox.date.hebrew.numerals");
(function(){
var _1="אבגדהוזחט";
var _2="יכלמנסעפצ";
var _3="קרשת";
var _4=function(_5,_6){
_5=_5.replace("יה","טו").replace("יו","טז");
if(!_6){
var _7=_5.length;
if(_7>1){
_5=_5.substr(0,_7-1)+"\""+_5.charAt(_7-1);
}else{
_5+="׳";
}
}
return _5;
};
var _8=function(_9){
var _a=0;
dojo.forEach(_9,function(ch){
var i;
if((i=_1.indexOf(ch))!=-1){
_a+=++i;
}else{
if((i=_2.indexOf(ch))!=-1){
_a+=10*++i;
}else{
if((i=_3.indexOf(ch))!=-1){
_a+=100*++i;
}
}
}
});
return _a;
};
var _b=function(_c){
var _d="",n=4,j=9;
while(_c){
if(_c>=n*100){
_d+=_3.charAt(n-1);
_c-=n*100;
continue;
}else{
if(n>1){
n--;
continue;
}else{
if(_c>=j*10){
_d+=_2.charAt(j-1);
_c-=j*10;
}else{
if(j>1){
j--;
continue;
}else{
if(_c>0){
_d+=_1.charAt(_c-1);
_c=0;
}
}
}
}
}
}
return _d;
};
dojox.date.hebrew.numerals.getYearHebrewLetters=function(_e){
var _f=_e%1000;
return _4(_b(_f));
};
dojox.date.hebrew.numerals.parseYearHebrewLetters=function(_10){
return _8(_10)+5000;
};
dojox.date.hebrew.numerals.getDayHebrewLetters=function(day,_11){
return _4(_b(day),_11);
};
dojox.date.hebrew.numerals.parseDayHebrewLetters=function(day){
return _8(day);
};
dojox.date.hebrew.numerals.getMonthHebrewLetters=function(_12){
return _4(_b(_12+1));
};
dojox.date.hebrew.numerals.parseMonthHebrewLetters=function(_13){
var _14=dojox.date.hebrew.numerals.parseDayHebrewLetters(_13)-1;
if(_14==-1||_14>12){
throw new Error("The month name is incorrect , month = "+_14);
}
return _14;
};
})();
}
