define(["dojo/_base/lang"],function(lang) {
	var gfx3d = lang.getObject("dojox.gfx3d",true);
	lang.mixin( gfx3d, {
		// summary:
		//		defines constants, prototypes, and utility functions
		
		// default objects, which are used to fill in missing parameters
		defaultEdges:	  {type: "edges",     style: null, points: []},
		defaultTriangles: {type: "triangles", style: null, points: []},
		defaultQuads:	  {type: "quads",     style: null, points: []},
		defaultOrbit:	  {type: "orbit",     center: {x: 0, y: 0, z: 0}, radius: 50},
		defaultPath3d:	  {type: "path3d",    path: []},
		defaultPolygon:	  {type: "polygon",   path: []},
		defaultCube:	  {type: "cube",      bottom: {x: 0, y: 0, z: 0}, top: {x: 100, y: 100, z: 100}},
		defaultCylinder:  {type: "cylinder",  center: /* center of bottom */ {x: 0, y: 0, z: 0}, height: 100, radius: 50}
	});
	return gfx3d;
});