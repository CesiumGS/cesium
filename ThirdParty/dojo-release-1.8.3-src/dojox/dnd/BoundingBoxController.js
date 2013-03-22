define(["dojo", "dojox"], function(dojo, dojox) {

	return dojo.declare('dojox.dnd.BoundingBoxController', null, {

			// summary:
			//		Allows the user draw bounding boxes around nodes on the page.
			//		Publishes to the "/dojox/dnd/bounding" topic to tell the selector to check
			//		to see whether any dnd items fall within the coordinates of the bounding box

			// x,y start and end coordinates for the bounding box
			_startX: null,
			_startY: null,
			_endX: null,
			_endY: null,

			constructor: function(sources, domNode) {
				// summary:
				//		Sets mouse handlers for the document to capture when a user
				//		is trying to draw a bounding box.
				// sources: dojox/dnd/Selector[]
				//		an array of dojox.dnd.Selectors which need to be aware of
				//		the positioning of the bounding box.
				// domNode: String|DomNode
				//		the DOM node or id which represents the bounding box on the page.
				this.events = [
					dojo.connect(dojo.doc, 'onmousedown', this, '_onMouseDown'),
					dojo.connect(dojo.doc, 'onmouseup', this, '_onMouseUp'),
					// cancel text selection and text dragging
					//dojo.connect(dojo.doc, "ondragstart",   dojo.stopEvent),
					//dojo.connect(dojo.doc, "onselectstart", dojo.stopEvent),
					// when a user is scrolling using a scrollbar, don't draw the bounding box.
					dojo.connect(dojo.doc, 'onscroll', this, '_finishSelecting')
				];
				// set up a subscription so the client can easily cancel a user drawing a bounding box.
				this.subscriptions = [
					dojo.subscribe('/dojox/bounding/cancel', this, '_finishSelecting')
				];
				dojo.forEach(sources, function(item) {
					// listen for "/dojox/dnd/bounding" events eminating from the bounding box.
					// for each of the dojox.dnd.selectors passed in args.
					if (item.selectByBBox) {
						this.subscriptions.push(dojo.subscribe('/dojox/dnd/bounding', item, 'selectByBBox'));
					}
				}, this);
				this.domNode = dojo.byId(domNode);
				dojo.style(this.domNode, {
					position: 'absolute',
					display: 'none'
				});
			},

			destroy: function() {
				// summary:
				//		prepares this object to be garbage-collected
				dojo.forEach(this.events, dojo.disconnect);
				dojo.forEach(this.subscriptions, dojo.unsubscribe);
				this.domNode = null;
			},

			shouldStartDrawingBox: function(evt) {
				// summary:
				//		Override-able by the client as an extra check to ensure that a bounding
				//		box should begin to be drawn. If the client has any preconditions to when a
				//		bounding box should be drawn, they should be included in this method.
				// evt: Object
				//		the mouse event which caused this callback to fire.
				return true;
			},

			boundingBoxIsViable: function(evt) {
				// summary:
				//		Override-able by the client as an extra check to ensure that a bounding
				//		box is viable. In some instances, it might not make sense that
				//		a mouse down -> mouse move -> mouse up interaction represents a bounding box.
				//		For example, if a dialog is open the client might want to suppress a bounding
				//		box. This function could be used by the client to ensure that a bounding box is only
				//		drawn on the document when certain conditions are met.
				// evt: Object
				//		the mouse event which caused this callback to fire.
				return true;
			},

			_onMouseDown: function(evt) {
				// summary:
				//		Executed when the user mouses down on the document. Resets the
				//		this._startX and this._startY member variables.
				// evt: Object
				//		the mouse event which caused this callback to fire.
				if (this.shouldStartDrawingBox(evt) && dojo.mouseButtons.isLeft(evt)) {
					if (this._startX == null) {
						this._startX = evt.clientX;
						this._startY = evt.clientY;
					}
					this.events.push(
						dojo.connect(dojo.doc, 'onmousemove', this, '_onMouseMove')
					);
				}
			},

			_onMouseMove: function(evt) {
				// summary:
				//		Executed when the user moves the mouse over the document. Delegates to
				//		this._drawBoundingBox if the user is trying to draw a bounding box.
				//		whether the user was drawing a bounding box and publishes to the
				//		"/dojox/dnd/bounding" topic if the user is finished drawing their bounding box.
				// evt: Object
				//		the mouse event which caused this callback to fire.
				this._endX = evt.clientX;
				this._endY = evt.clientY;
				this._drawBoundingBox();
			},

			_onMouseUp: function(evt) {
				// summary:
				//		Executed when the users mouses up on the document. Checks to see
				//		whether the user was drawing a bounding box and publishes to the
				//		"/dojox/dnd/bounding" topic if the user is finished drawing their bounding box.
				// evt: Object
				//		the mouse event which caused this callback to fire.
				if (this._endX !== null && this.boundingBoxIsViable(evt)) {
					// the user has moused up ... tell the selector to check to see whether
					// any nodes within the bounding box need to be selected.
					dojo.publish('/dojox/dnd/bounding', [this._startX, this._startY, this._endX, this._endY]);
				}
				this._finishSelecting();
			},

			_finishSelecting: function() {
				// summary:
				//		hide the bounding box and reset for the next time around
				if (this._startX !== null) {
					dojo.disconnect(this.events.pop());
					dojo.style(this.domNode, 'display', 'none');
					this._startX = null;
					this._endX = null;
				}
			},

			_drawBoundingBox: function() {
				// summary:
				//		draws the bounding box over the document.
				dojo.style(this.domNode, {
					left: Math.min(this._startX, this._endX) + 'px',
					top: Math.min(this._startY, this._endY) + 'px',
					width: Math.abs(this._startX - this._endX) + 'px',
					height: Math.abs(this._startY - this._endY) + 'px',
					display: ''
				});
			}
		}
	);
});