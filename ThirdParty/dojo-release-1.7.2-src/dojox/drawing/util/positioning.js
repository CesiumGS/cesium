dojo.provide("dojox.drawing.util.positioning");

(function(){
	
	var textOffset = 4;  // distance from line to text box
	var textYOffset = 20;  // height of text box
	
	
	dojox.drawing.util.positioning.label = function(/*Object*/start, /*Object*/end){
		// summary:
		//		Returns the optimal text positions for annotations.Label.
		
		// label at middle of vector
		var x = 0.5*(start.x+end.x);
		var y = 0.5*(start.y+end.y);
		
		// move label a set distance from the line
		var slope = dojox.drawing.util.common.slope(start, end);
		var deltay = textOffset/Math.sqrt(1.0+slope*slope);
		
		if(end.y>start.y && end.x>start.x || end.y<start.y && end.x<start.x){
			// Position depending on quadrant.  Y offset
			// positions box aligned vertically from top
			deltay = -deltay;
			y -= textYOffset;
		}
		x += -deltay*slope;
		y += deltay;
		
		// want text to be away from start of vector
		// This will make force diagrams less crowded
		var align = end.x<start.x ? "end" : "start";
		
		return { x:x, y:y, foo:"bar", align:align}; // Object
	};
	
	dojox.drawing.util.positioning.angle = function(/*Object*/start, /*Object*/end){
		// summary:
		//		Returns the optimal position for annotations.Angle.
		//
		// angle at first third of vector
	        var x = 0.7*start.x+0.3*end.x;
	        var y = 0.7*start.y+0.3*end.y;
		// move label a set distance from the line
		var slope = dojox.drawing.util.common.slope(start, end);
		var deltay = textOffset/Math.sqrt(1.0+slope*slope);
		
		if(end.x<start.x){deltay = -deltay;}
		x += -deltay * slope;
		y += deltay;
		
		// want text to be clockwise from vector
		// to match angle measurement from x-axis
		var align = end.y>start.y ? "end" : "start";
	        // box vertical aligned from middle
	        y += end.x > start.x ? 0.5*textYOffset :  -0.5*textYOffset;
		
		return { x:x, y:y, align:align}; // Object
	}
	
})();



