dojo.provide("dojox.data.demos.widgets.FileView");
dojo.require("dijit._Templated");
dojo.require("dijit._Widget");

dojo.declare("dojox.data.demos.widgets.FileView", [dijit._Widget, dijit._Templated], {
	//Simple demo widget for representing a view of a Flickr Item.

	templateString: dojo.cache("dojox", "data/demos/widgets/templates/FileView.html"),

	//Attach points for reference.
	titleNode: null,
	descriptionNode: null,
	imageNode: null,
	authorNode: null,

	name: "",
	path: "",
	size: 0,
	directory: false,
	parentDir: "",
	children: [],

	postCreate: function(){
		this.nameNode.appendChild(document.createTextNode(this.name));
		this.pathNode.appendChild(document.createTextNode(this.path));
		this.sizeNode.appendChild(document.createTextNode(this.size));
		this.directoryNode.appendChild(document.createTextNode(this.directory));
		this.parentDirNode.appendChild(document.createTextNode(this.parentDir));
		if (this.children && this.children.length > 0) {
			var i;
			for (i = 0; i < this.children.length; i++) {
				var tNode = document.createTextNode(this.children[i]);
				this.childrenNode.appendChild(tNode);
				if (i < (this.children.length - 1)) {
					this.childrenNode.appendChild(document.createElement("br"));
				}
			}
		}
	}
});
