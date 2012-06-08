/*!
 * Copyright 2011-2012, Analytical Graphics, Inc.
 */
(function() {
    "use strict";
    /*global Cesium,Sandbox,dojo,dijit,SandboxTree,SandboxTreeNode*/

    dojo.declare('SandboxTree', [dijit.Tree], { // Extend dojo's tree display

        optionScope : null,
        optionMethod : null,

        // Override the dojo's create node
        _createTreeNode : function( /*Object*/args) {
            return new SandboxTreeNode(args);
        }
    });

    dojo.provide('SandboxTreeNode'); // Import the custom tree class

    dojo.declare('SandboxTreeNode', [dijit._TreeNode], { // Extend dojo's tree node

        // Override the default constructor
        _createTreeNode : function( /*Object*/args) {

            return new SandboxTreeNode(args);

        },

        // postCreate fires after nodes are created, but before they are
        //rendered to the screen
        postCreate : function() {

            // Set up the On/Off code examples:
            if (this.item.codeSnippet && this.item.codeSnippet.length > 1) {

                // Store the container for the tree node
                var containerDOM = this.domNode.children[0];

                // Create the On/Off buttons
                var toggleOn = dojo.create('a', {
                    className : 'treeIcon toggleOn'
                }, containerDOM, 'last');
                var toggleOff = dojo.create('a', {
                    className : 'treeIcon toggleOff'
                }, containerDOM, 'last');

                // Place them next to the tree item
                dojo.style(containerDOM, 'position', 'relative');

                // Set up event handling:

                var editor = Cesium.Sandbox.getCodeEditor();

                var onCode = this.item.codeSnippet[0];

                dojo.connect(toggleOn, 'onclick', this, function(e) { // On button
                    Sandbox.reset();

                    editor.display(Sandbox.beautify(onCode.code.toString()));

                    onCode.code();

                    dojo.stopEvent(e);
                });

                var offCode = this.item.codeSnippet[1];

                dojo.connect(toggleOff, 'onclick', this, function(e) { // Off button
                    Sandbox.reset();

                    editor.display(Sandbox.beautify(offCode.code.toString()));

                    offCode.code();

                    dojo.stopEvent(e);
                });
            }
        } // End postCreate
    });

    /**
     * Abstracts the dijit tree and aids in its construction.
     *
     * @param {String} id The DOM object to turn into a tree.
     * @param {Array} [data] An array of tree nodes (Objects with the fields:
     * label and codeSnippet) to be inserted into this tree.
     *
     * @constructor
     */
    Sandbox.Tree = function(id, data) {
        this._id = id;
        this._data = data || [];
        this._tree = null;
    };

    /**
     * Appends a node onto the tree.
     *
     * @param {String} label The text that will be displayed for this node in
     * the Tree.
     * @param {Array} [codeSnippet] Array of objects containing API examples.
     * If the array is of length 2, an on/off toggle switch will be created.
     * @param {Object} parent An object of type node (containing: label,
     * [codeSnippet], icon).  If parent is null, this node will be assumed to be
     * a root (top-level) node.
     * @param {String} icon Reference string to a Dojo Icon that will be
     * displayed next to this node.
     *
     * @return {Object} Returns the newly created node so it may be used in
     * building the tree.
     */
    Sandbox.Tree.prototype.addNode = function(label, codeSnippet, parent, icon) {
        var node = {
            label : label,
            codeSnippet : codeSnippet,
            icon : icon
        };

        if (parent) { // Append this node to it's parent, if it has one.

            if (!parent.children) { // Initialize children if the parent has none
                parent.children = [];
            }

            parent.children.push(node);
        } else { // This is a top-level node
            this._data.push(node);
        }

        return node;
    };

    /**
     * Creates the actual Dijit tree.
     */
    Sandbox.Tree.prototype.publish = function() {
        var setIcon = dojo.hitch(this,

        function( /*dojo.data.Item*/item, /*Boolean*/opened) {
            // Connect the node with it's corresponding icon class
            // See notes in all.css  .
            if (item.icon && item.icon[0]) {
                return ('treeIcon ' + item.icon[0]) || 'dijitLeaf';
            }
            // Handle node's with children and no icon
            return (opened ? 'dijitFolderOpened' : 'dijitFolderClosed');
        });

        /* Dojo's pseudo-database.  Data after construction can be accessed
         * via the query method; e.g., <code>store.query('String')</code>
         * This is needed because Dojo's tree display was designed to connect
         * to a database and/or a JSON containing URI.
         *
         * The label attribute determines each element's primary key.
         */
        var store = new dojo.data.ItemFileReadStore({
            data : {
                label : 'label',
                items : this._data
            }
        });

        /* Model indicating how store should organize the data.
         * The Forest Model indicates several trees with no common
         * root node.
         */
        var treeModel = new dijit.tree.ForestStoreModel({
            store : store,
            childrenAttrs : ['children']
        });

        // The actual Dojo Tree object
        var treeControl = new SandboxTree({
            model : treeModel,
            showRoot : false,
            openOnDblClick : true,
            persist : false,
            autoExpand : true,
            optionScope : this,
            getIconClass : setIcon
        }, this._id);

        this._store = store;
        this._tree = treeControl;
    };

    /**
     * Returns the id of the DOM element containing this tree.
     *
     * @returns {String} The tree's id.
     */
    Sandbox.Tree.prototype.getId = function() {
        return this._id;
    };

    /**
     * Returns the pseudo-database of code examples from which the
     * tree control is generated.
     *
     * @returns {String} The tree's pseudo-database.
     */
    Sandbox.Tree.prototype.getStore = function() {
        return this._store;
    };

    /**
     *  Returns the tree's Dojo instance.
     *
     * @returns the dijit.Tree object.
     */
    Sandbox.Tree.prototype.getTree = function() {
        return this._tree;
    };

    /**
     * @returns An array of top-level nodes whose labels or code snippets
     * contain the keyword. This array can be used as the data field to
     * construct a new Sandbox.Tree
     */
    Sandbox.Tree.prototype.search = function(keyword) {

        var resultsData = [];

        /*
         * Returns a copy of a specific node.  The tree returned is built from
         * these copies to prevent javascript from breaking the parent-child
         * relationships of the original tree when it creates the new one.
         */
        function getClone(root) {

            var toReturn = {
                label : root.label,
                codeSnippet : [],
                icon : root.icon,
                children : []
            };

            if (root.codeSnippet) {

                for ( var cs = 0; cs < root.codeSnippet.length; cs++) {

                    toReturn.codeSnippet.push(root.codeSnippet[cs]);
                }
            }

            if (root.children) {

                for ( var nextNode = 0; nextNode < root.children.length; nextNode++) {

                    toReturn.children.push(getClone(root.children[nextNode]));
                }
            }

            return toReturn;
        }

        // Returns a subtree containing only nodes that contain keyword or
        //children with keyword
        function getSubtree(root, keyword) {

            var toAppend = null;
            var clone = getClone(root);

            // Check label for keyword
            if (root.label[0].toString().toLowerCase().indexOf(keyword) !== -1) {
                return clone;
            } else if (root.codeSnippet) { // Check codeSnippets for keyword

                for ( var currentSnippet = 0; currentSnippet < root.codeSnippet.length; currentSnippet++) {

                    if (root.codeSnippet[currentSnippet].code && root.codeSnippet[currentSnippet].code.toString().toLowerCase().indexOf(keyword) !== -1) {

                        return clone;
                    }
                }
            }

            // If it's not in this node try the child nodes.
            if (root.children) {

                clone.children = [];

                for ( var kids = 0; kids < root.children.length; kids++) {

                    toAppend = getSubtree(root.children[kids], keyword);

                    if (toAppend) {

                        clone.children.push(toAppend);

                        return clone;
                    }
                }
            }

            return null; // No keyword found
        }

        keyword = keyword || document.getElementById('searchBox').value;

        if (keyword.length) {

            keyword = keyword.toLowerCase();

            // Cycle root nodes
            for ( var tree = 0; tree < this._data.length; tree++) {

                var root = this._data[tree];

                var potentialAdd = getSubtree(root, keyword);

                // The keyword was found in this tree.
                if (potentialAdd) {

                    resultsData.push(potentialAdd);
                }
            }
            return resultsData;
        }

        return this._data; // Search box empty (return entire tree)
    };
}());