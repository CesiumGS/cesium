/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import{a as O}from"./chunk-EDXNYDRG.js";import{c as I,e as V}from"./chunk-BZH667V4.js";import{a as W,b as v}from"./chunk-CJUPDKMM.js";import{a as R}from"./chunk-RSM3RCYG.js";import{a as k}from"./chunk-BJ5TGS5X.js";import{e as N}from"./chunk-FZAERGXZ.js";var z=Math.cos,Z=Math.sin,D=Math.sqrt,L={};L.computePosition=function(t,_,l,h,G,u,a){let e=_.radiiSquared,i=t.nwCorner,r=t.boundingRectangle,n=i.latitude-t.granYCos*h+G*t.granXSin,X=z(n),Y=Z(n),d=e.z*Y,s=i.longitude+h*t.granYSin+G*t.granXCos,S=X*z(s),f=X*Z(s),w=e.x*S,m=e.y*f,M=D(w*S+m*f+d*Y);if(u.x=w/M,u.y=m/M,u.z=d/M,l){let o=t.stNwCorner;N(o)?(n=o.latitude-t.stGranYCos*h+G*t.stGranXSin,s=o.longitude+h*t.stGranYSin+G*t.stGranXCos,a.x=(s-t.stWest)*t.lonScalar,a.y=(n-t.stSouth)*t.latScalar):(a.x=(s-r.west)*t.lonScalar,a.y=(n-r.south)*t.latScalar)}};var A=new V,g=new W,F=new v,b=new W,q=new O;function B(t,_,l,h,G,u,a){let e=Math.cos(_),i=h*e,r=l*e,n=Math.sin(_),X=h*n,Y=l*n;g=q.project(t,g),g=W.subtract(g,b,g);let d=V.fromRotation(_,A);g=V.multiplyByVector(d,g,g),g=W.add(g,b,g),t=q.unproject(g,t),u-=1,a-=1;let s=t.latitude,S=s+u*Y,f=s-i*a,w=s-i*a+u*Y,m=Math.max(s,S,f,w),M=Math.min(s,S,f,w),o=t.longitude,y=o+u*r,T=o+a*X,E=o+a*X+u*r,j=Math.max(o,y,T,E),x=Math.min(o,y,T,E);return{north:m,south:M,east:j,west:x,granYCos:i,granYSin:X,granXCos:r,granXSin:Y,nwCorner:t}}L.computeOptions=function(t,_,l,h,G,u,a){let e=t.east,i=t.west,r=t.north,n=t.south,X=!1,Y=!1;r===R.PI_OVER_TWO&&(X=!0),n===-R.PI_OVER_TWO&&(Y=!0);let d,s=r-n;i>e?d=R.TWO_PI-i+e:d=e-i;let S=Math.ceil(d/_)+1,f=Math.ceil(s/_)+1,w=d/(S-1),m=s/(f-1),M=I.northwest(t,u),o=I.center(t,F);(l!==0||h!==0)&&(o.longitude<M.longitude&&(o.longitude+=R.TWO_PI),b=q.project(o,b));let y=m,T=w,E=0,j=0,x=I.clone(t,G),c={granYCos:y,granYSin:E,granXCos:T,granXSin:j,nwCorner:M,boundingRectangle:x,width:S,height:f,northCap:X,southCap:Y};if(l!==0){let C=B(M,l,w,m,o,S,f);if(r=C.north,n=C.south,e=C.east,i=C.west,r<-R.PI_OVER_TWO||r>R.PI_OVER_TWO||n<-R.PI_OVER_TWO||n>R.PI_OVER_TWO)throw new k("Rotated rectangle is invalid.  It crosses over either the north or south pole.");c.granYCos=C.granYCos,c.granYSin=C.granYSin,c.granXCos=C.granXCos,c.granXSin=C.granXSin,x.north=r,x.south=n,x.east=e,x.west=i}if(h!==0){l=l-h;let C=I.northwest(x,a),P=B(C,l,w,m,o,S,f);c.stGranYCos=P.granYCos,c.stGranXCos=P.granXCos,c.stGranYSin=P.granYSin,c.stGranXSin=P.granXSin,c.stNwCorner=C,c.stWest=P.west,c.stSouth=P.south}return c};var nt=L;export{nt as a};
