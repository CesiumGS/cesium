/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.date.hebrew.Date"]){
dojo._hasResource["dojox.date.hebrew.Date"]=true;
dojo.provide("dojox.date.hebrew.Date");
dojo.require("dojox.date.hebrew.numerals");
dojo.declare("dojox.date.hebrew.Date",null,{_MONTH_LENGTH:[[30,30,30],[29,29,30],[29,30,30],[29,29,29],[30,30,30],[30,30,30],[29,29,29],[30,30,30],[29,29,29],[30,30,30],[29,29,29],[30,30,30],[29,29,29]],_MONTH_START:[[0,0,0],[30,30,30],[59,59,60],[88,89,90],[117,118,119],[147,148,149],[147,148,149],[176,177,178],[206,207,208],[235,236,237],[265,266,267],[294,295,296],[324,325,326],[353,354,355]],_LEAP_MONTH_START:[[0,0,0],[30,30,30],[59,59,60],[88,89,90],[117,118,119],[147,148,149],[177,178,179],[206,207,208],[236,237,238],[265,266,267],[295,296,297],[324,325,326],[354,355,356],[383,384,385]],_GREGORIAN_MONTH_COUNT:[[31,31,0,0],[28,29,31,31],[31,31,59,60],[30,30,90,91],[31,31,120,121],[30,30,151,152],[31,31,181,182],[31,31,212,213],[30,30,243,244],[31,31,273,274],[30,30,304,305],[31,31,334,335]],_date:0,_month:0,_year:0,_hours:0,_minutes:0,_seconds:0,_milliseconds:0,_day:0,constructor:function(){
var _1=arguments.length;
if(!_1){
this.fromGregorian(new Date());
}else{
if(_1==1){
var _2=arguments[0];
if(typeof _2=="number"){
_2=new Date(_2);
}
if(_2 instanceof Date){
this.fromGregorian(_2);
}else{
if(_2==""){
this._date=new Date("");
}else{
this._year=_2._year;
this._month=_2._month;
this._date=_2._date;
this._hours=_2._hours;
this._minutes=_2._minutes;
this._seconds=_2._seconds;
this._milliseconds=_2._milliseconds;
}
}
}else{
if(_1>=3){
this._year+=arguments[0];
this._month+=arguments[1];
this._date+=arguments[2];
if(this._month>12){
console.warn("the month is incorrect , set 0  "+this._month+"   "+this._year);
this._month=0;
}
this._hours+=arguments[3]||0;
this._minutes+=arguments[4]||0;
this._seconds+=arguments[5]||0;
this._milliseconds+=arguments[6]||0;
}
}
}
this._setDay();
},getDate:function(){
return this._date;
},getDateLocalized:function(_3){
return (_3||dojo.locale).match(/^he(?:-.+)?$/)?dojox.date.hebrew.numerals.getDayHebrewLetters(this._date):this.getDate();
},getMonth:function(){
return this._month;
},getFullYear:function(){
return this._year;
},getHours:function(){
return this._hours;
},getMinutes:function(){
return this._minutes;
},getSeconds:function(){
return this._seconds;
},getMilliseconds:function(){
return this._milliseconds;
},setDate:function(_4){
_4=+_4;
var _5;
if(_4>0){
while(_4>(_5=this.getDaysInHebrewMonth(this._month,this._year))){
_4-=_5;
this._month++;
if(this._month>=13){
this._year++;
this._month-=13;
}
}
}else{
while(_4<=0){
_5=this.getDaysInHebrewMonth((this._month-1)>=0?(this._month-1):12,((this._month-1)>=0)?this._year:this._year-1);
this._month--;
if(this._month<0){
this._year--;
this._month+=13;
}
_4+=_5;
}
}
this._date=_4;
this._setDay();
return this;
},setFullYear:function(_6,_7,_8){
this._year=_6=+_6;
if(!this.isLeapYear(_6)&&this._month==5){
this._month++;
}
if(_7!==undefined){
this.setMonth(_7);
}
if(_8!==undefined){
this.setDate(_8);
}
var _9=this.getDaysInHebrewMonth(this._month,this._year);
if(_9<this._date){
this._date=_9;
}
this._setDay();
return this;
},setMonth:function(_a){
_a=+_a;
if(!this.isLeapYear(this._year)&&_a==5){
_a++;
}
if(_a>=0){
while(_a>12){
this._year++;
_a-=13;
if(!this.isLeapYear(this._year)&&_a>=5){
_a++;
}
}
}else{
while(_a<0){
this._year--;
_a+=(!this.isLeapYear(this._year)&&_a<-7)?12:13;
}
}
this._month=_a;
var _b=this.getDaysInHebrewMonth(this._month,this._year);
if(_b<this._date){
this._date=_b;
}
this._setDay();
return this;
},setHours:function(){
var _c=arguments.length;
var _d=0;
if(_c>=1){
_d+=+arguments[0];
}
if(_c>=2){
this._minutes+=+arguments[1];
}
if(_c>=3){
this._seconds+=+arguments[2];
}
if(_c==4){
this._milliseconds+=+arguments[3];
}
while(_d>=24){
this._date++;
var _e=this.getDaysInHebrewMonth(this._month,this._year);
if(this._date>_e){
this._month++;
if(!this.isLeapYear(this._year)&&this._month==5){
this._month++;
}
if(this._month>=13){
this._year++;
this._month-=13;
}
this._date-=_e;
}
_d-=24;
}
this._hours=_d;
this._setDay();
return this;
},setMinutes:function(_f){
_f=+_f;
this._minutes=_f%60;
this.setHours(parseInt(_f/60));
this._setDay();
return this;
},setSeconds:function(_10){
_10=+_10;
this._seconds=_10%60;
this.setMinutes(parseInt(_10/60));
this._setDay();
return this;
},setMilliseconds:function(_11){
_11=+_11;
this._milliseconds=_11%1000;
this.setSeconds(parseInt(_11/1000));
this._setDay();
return this;
},_setDay:function(){
var day=this._startOfYear(this._year);
if(this._month!=0){
day+=(this.isLeapYear(this._year)?this._LEAP_MONTH_START:this._MONTH_START)[this._month][this._yearType(this._year)];
}
day+=this._date-1;
this._day=(day+1)%7;
},toString:function(){
return this._date+", "+this._month+", "+this._year+"  "+this._hours+":"+this._minutes+":"+this._seconds;
},getDaysInHebrewMonth:function(_12,_13){
var _14=(_12==1||_12==2)?this._yearType(_13):0;
return (!this.isLeapYear(this._year)&&_12==5)?0:this._MONTH_LENGTH[_12][_14];
},_yearType:function(_15){
var _16=this._handleGetYearLength(Number(_15));
if(_16>380){
_16-=30;
}
var _17=_16-353;
if(_17<0||_17>2){
throw new Error("Illegal year length "+_16+" in year "+_15);
}
return _17;
},_handleGetYearLength:function(_18){
return this._startOfYear(_18+1)-this._startOfYear(_18);
},_startOfYear:function(_19){
var _1a=Math.floor((235*_19-234)/19),_1b=_1a*(12*1080+793)+11*1080+204,day=_1a*29+Math.floor(_1b/(24*1080));
_1b%=24*1080;
var wd=day%7;
if(wd==2||wd==4||wd==6){
day+=1;
wd=day%7;
}
if(wd==1&&_1b>15*1080+204&&!this.isLeapYear(_19)){
day+=2;
}else{
if(wd==0&&_1b>21*1080+589&&this.isLeapYear(_19-1)){
day+=1;
}
}
return day;
},isLeapYear:function(_1c){
var x=(_1c*12+17)%19;
return x>=((x<0)?-7:12);
},fromGregorian:function(_1d){
var _1e=this._computeHebrewFields(_1d);
this._year=_1e[0];
this._month=_1e[1];
this._date=_1e[2];
this._hours=_1d.getHours();
this._milliseconds=_1d.getMilliseconds();
this._minutes=_1d.getMinutes();
this._seconds=_1d.getSeconds();
this._setDay();
return this;
},_computeHebrewFields:function(_1f){
var _20=this._getJulianDayFromGregorianDate(_1f),d=_20-347997,m=Math.floor((d*24*1080)/(29*24*1080+12*1080+793)),_21=Math.floor((19*m+234)/235)+1,ys=this._startOfYear(_21),_22=(d-ys);
while(_22<1){
_21--;
ys=this._startOfYear(_21);
_22=d-ys;
}
var _23=this._yearType(_21),_24=this.isLeapYear(_21)?this._LEAP_MONTH_START:this._MONTH_START,_25=0;
while(_22>_24[_25][_23]){
_25++;
}
_25--;
var _26=_22-_24[_25][_23];
return [_21,_25,_26];
},toGregorian:function(){
var _27=this._year,_28=this._month,_29=this._date,day=this._startOfYear(_27);
if(_28!=0){
day+=(this.isLeapYear(_27)?this._LEAP_MONTH_START:this._MONTH_START)[_28][this._yearType(_27)];
}
var _2a=(_29+day+347997),_2b=_2a-1721426;
var rem=[];
var _2c=this._floorDivide(_2b,146097,rem),_2d=this._floorDivide(rem[0],36524,rem),n4=this._floorDivide(rem[0],1461,rem),n1=this._floorDivide(rem[0],365,rem),_2e=400*_2c+100*_2d+4*n4+n1,_2f=rem[0];
if(_2d==4||n1==4){
_2f=365;
}else{
++_2e;
}
var _30=!(_2e%4)&&(_2e%100||!(_2e%400)),_31=0,_32=_30?60:59;
if(_2f>=_32){
_31=_30?1:2;
}
var _33=Math.floor((12*(_2f+_31)+6)/367);
var _34=_2f-this._GREGORIAN_MONTH_COUNT[_33][_30?3:2]+1;
return new Date(_2e,_33,_34,this._hours,this._minutes,this._seconds,this._milliseconds);
},_floorDivide:function(_35,_36,_37){
if(_35>=0){
_37[0]=(_35%_36);
return Math.floor(_35/_36);
}
var _38=Math.floor(_35/_36);
_37[0]=_35-(_38*_36);
return _38;
},getDay:function(){
var _39=this._year,_3a=this._month,_3b=this._date,day=this._startOfYear(_39);
if(_3a!=0){
day+=(this.isLeapYear(_39)?this._LEAP_MONTH_START:this._MONTH_START)[_3a][this._yearType(_39)];
}
day+=_3b-1;
return (day+1)%7;
},_getJulianDayFromGregorianDate:function(_3c){
var _3d=_3c.getFullYear(),_3e=_3c.getMonth(),d=_3c.getDate(),_3f=!(_3d%4)&&(_3d%100||!(_3d%400)),y=_3d-1;
var _40=365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)+1721426-1;
if(_3e!=0){
_40+=this._GREGORIAN_MONTH_COUNT[_3e][_3f?3:2];
}
_40+=d;
return _40;
}});
dojox.date.hebrew.Date.prototype.valueOf=function(){
return this.toGregorian().valueOf();
};
}
