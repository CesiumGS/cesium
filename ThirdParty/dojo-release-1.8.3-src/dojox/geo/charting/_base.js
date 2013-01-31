define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"../../main",
	"dojo/_base/html",
	"dojo/dom-geometry",
	"dojox/gfx/matrix",
	"dijit/Tooltip",
	"dojo/_base/NodeList",
	"dojo/NodeList-traverse"
], function(lang, arr, dojox, html, domGeom, matrix, Tooltip, NodeList, NodeListTraverse){
	var dgc = lang.getObject("geo.charting", true, dojox); 

	dgc.showTooltip = function(/*String*/innerHTML, /*dojox/gfx/shape.Shape*/ gfxObject, /*String[]?*/ positions){
		// summary:
		//		Show a Tooltip displaying the given HTML message around the given gfx shape.
		// innerHTML: String
		//		The message to display as a HTML string.
		// gfxObject: dojox/gfx/shape.Shape
		//		The gfx shape around which the tooltip will be placed.
		// position: String[]?
		//		The tooltip position.
		var arroundNode = dgc._normalizeArround(gfxObject);
		return Tooltip.show(innerHTML, arroundNode, positions);
	};

	dgc.hideTooltip = function( /*dojox/gfx/shape.Shape*/gfxObject){
		// summary:
		//		Hides the tooltip displayed around the given shape.
		// gfxObject: dojox.gfx.shape.Shape
		//		A gfx shape.
		return Tooltip.hide(gfxObject);
	};

	dgc._normalizeArround = function(gfxObject){
		var bbox = dgc._getRealBBox(gfxObject);
		//var bbox = gfxObject.getBoundingBox();
		//get the real screen coords for gfx object
		var realMatrix = gfxObject._getRealMatrix() || {xx:1,xy:0,yx:0,yy:1,dx:0,dy:0};
		var point = matrix.multiplyPoint(realMatrix, bbox.x, bbox.y);
		var gfxDomContainer = dgc._getGfxContainer(gfxObject);
		gfxObject.x = domGeom.position(gfxDomContainer,true).x + point.x,
		gfxObject.y = domGeom.position(gfxDomContainer,true).y + point.y,
		gfxObject.w = bbox.width * realMatrix.xx,
		gfxObject.h = bbox.height * realMatrix.yy
		return gfxObject;
	};

	dgc._getGfxContainer = function(gfxObject){
		if(gfxObject.surface){
			return (new NodeList(gfxObject.surface.rawNode)).parents("div")[0];
		}else{
			return (new NodeList(gfxObject.rawNode)).parents("div")[0];
		}
	};

	dgc._getRealBBox = function(gfxObject){
		var bboxObject = gfxObject.getBoundingBox();
		if(!bboxObject){//the gfx object is group
			var shapes = gfxObject.children;
			bboxObject = lang.clone(dgc._getRealBBox(shapes[0]));
			arr.forEach(shapes, function(item){
				var nextBBox = dgc._getRealBBox(item);
				bboxObject.x = Math.min(bboxObject.x, nextBBox.x);
				bboxObject.y = Math.min(bboxObject.y, nextBBox.y);
				bboxObject.endX = Math.max(bboxObject.x + bboxObject.width, nextBBox.x + nextBBox.width);
				bboxObject.endY = Math.max(bboxObject.y + bboxObject.height, nextBBox.y + nextBBox.height);
			});
			bboxObject.width = bboxObject.endX - bboxObject.x;
			bboxObject.height = bboxObject.endY - bboxObject.y;
		}
		return bboxObject;
	};
	
	return dgc;
});
