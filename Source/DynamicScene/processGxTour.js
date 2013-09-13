/*global define*/
define(['../Core/DeveloperError',
	'../Core/Cartographic',
	'../Core/Matrix3'
], function(
	DeveloperError,
	Cartographic,
	Matrix3
) {
	"use strict";




	var processor = function(){
		var my = {
			// GX_NS: 'http://www.google.com/kml/ext/2.2'
		};

		// -- private section
		var _context = {};
		var _playlist = [];

		/**
		 * Pick the first child node with matching name 
		 *
		 * @param {DOM Node} parent Parent node
		 * @param {String} nodeName String to match with node names
		 *
		 * @return {DOM Node} Found node or null
		 */
		var subnode = function(parent, nodeName) {
			var i;
			for (i=0; i<parent.childNodes.length; i++) {
				if (parent.childNodes.item(i).nodeName === nodeName) {
					return parent.childNodes.item(i);
                }
			}
			return null;
		};


		/**
		 * Convenience method to collect values of single-value child nodes
		 * <parent><node1>val1</node1><node2>val2</node2></parent>
		 * will be turned to {node1: 'val1', node2: 'val2'} object
		 *
		 * @param {DOM Node} parent Node whose child values are collected
		 * @param {DOM Node} Optional list of node names to exclude (optional)
		 * @return {Object} Simple map of node->value pairs
		 */
		var collectValues = function(parent, skipNodes) {
			var values = {};
			if (skipNodes === undefined) {
				skipNodes = [];
            }
			var node, nname;
			var i, j;
			for (i=0; i<parent.childNodes.length; i++) {
				node = parent.childNodes.item(i);
				if (skipNodes.indexOf(node.nodeName) === -1 && node.nodeType === 1) {
					values[node.nodeName] = node.firstChild.textContent;
				}
			}
			return values;
		};

		var processGxFlyToNode = function(node) {
			var obj, val, obj2;
			var result = {
				type: 'flyTo',
				mode: 'smooth' // fly-to mode: smooth or bounce
			};

			// get duration
			obj = subnode(node, 'gx:duration');
			// duration: specified in SECS
			result.duration = obj.textContent ? parseFloat(obj.textContent)*1000 : 0;

			// get flyToMode: smooth or boubce
			obj = subnode(node, 'gx:flyToMode');
			if (obj !== undefined) {
				val = obj.textContent;
				if ('bounce' === val) {
					result.mode = val; // fall back to old Google Earth behaviour
                }
			}

			// Process Camera :: AbstractView
			// Def: Camera specifies the view in terms of the viewer's position and orientation
			// See: https://developers.google.com/kml/documentation/cameras
			obj = subnode(node, 'Camera');
			if (obj) {
				val = (function(camNode){
					var cam = {};
					var o, v;
					var coords = [], orientation = [];

					// TBD those nodes will be processed later
					v = collectValues(camNode, ['gx:TimeStamp', 'gx:TimeSpan']);

					// camera location: longitude, latitude, altitude - in Degrees!
					coords.push( parseFloat(v.longitude), parseFloat(v.latitude), parseFloat(v.altitude));
					cam.location = new Cartographic.fromDegrees(coords[0], coords[1], coords[2]);
					cam.altitudeMode = v.altitudeMode || 'absolute';

					// orientation: heading, tilt, roll
					orientation.push( parseFloat(v.heading), parseFloat(v.tilt), parseFloat(v.roll) );
					cam.orientation = orientation;

					return cam;
				})(obj);

				result.camera = val;
			} else {
				// Process LookAt :: AbstractView
				// Def: LookAt specifies the view in terms of the point of interest that is being viewed
				obj = subnode(node, 'LookAt');
				if (obj) {
					// TBD
				}
			}

			return result;
		};


		/**
		 * The main entry.
		 *
		 * @param {KML Node} kmlNode The root node of gx:Tour subtree
		 */
		my.processTour = function(kmlNode) {
			var n, i, o, pl, item;
			if (kmlNode === undefined) {
				throw new DeveloperError('Missing gx:Tour node');
            } else if (kmlNode.nodeName !== 'gx:Tour') {
				throw new DeveloperError('Bad node!');
            }


			// reset context
			_context = {};

			// get name
			n = subnode(kmlNode, 'name');
			_context.tourName = n.textContent;

			// go through playlist elements
			pl = subnode(kmlNode, 'gx:Playlist');
			for (i=0; i<pl.childNodes.length; i++) {
				o = pl.childNodes.item(i);

				switch(o.nodeName) {
					case 'gx:FlyTo':
						item = processGxFlyToNode(o);
						_playlist.push(item);
						break;
					case 'gx:Wait':
						// TBD
						break;
					case 'gx:TourControl':
						// Skip...
						break;
					default:
						break;
				}
			}
		};


		/**
		 * Access processed tour playlist
		 */
		my.getPlaylist = function() {
			return _playlist;
		};

		return my;
	};

	processor.GX_NS = 'http://www.google.com/kml/ext/2.2';


	return processor;
});
