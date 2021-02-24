function quickselect(arr, k, left, right, compare) {
    quickselectStep(arr, k, left || 0, right || (arr.length - 1), compare || defaultCompare);
}

function quickselectStep(arr, k, left, right, compare) {

    while (right > left) {
        if (right - left > 600) {
            var n = right - left + 1;
            var m = k - left + 1;
            var z = Math.log(n);
            var s = 0.5 * Math.exp(2 * z / 3);
            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
            quickselectStep(arr, k, newLeft, newRight, compare);
        }

        var t = arr[k];
        var i = left;
        var j = right;

        swap(arr, left, k);
        if (compare(arr[right], t) > 0) { swap(arr, left, right); }

        while (i < j) {
            swap(arr, i, j);
            i++;
            j--;
            while (compare(arr[i], t) < 0) { i++; }
            while (compare(arr[j], t) > 0) { j--; }
        }

        if (compare(arr[left], t) === 0) { swap(arr, left, j); }
        else {
            j++;
            swap(arr, j, right);
        }

        if (j <= k) { left = j + 1; }
        if (k <= j) { right = j - 1; }
    }
}

function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

function defaultCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function RBush(maxEntries) {
    if ( maxEntries === void 0 ) maxEntries = 9;

    // max entries in a node is 9 by default; min node fill is 40% for best performance
    this._maxEntries = Math.max(4, maxEntries);
    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
    this.clear();
};

RBush.prototype.all = function all () {
    return this._all(this.data, []);
};

RBush.prototype.search = function search (bbox) {
    var node = this.data;
    var result = [];

    if (!intersects(bbox, node)) { return result; }

    var toBBox = this.toBBox;
    var nodesToSearch = [];

    while (node) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            var childBBox = node.leaf ? toBBox(child) : child;

            if (intersects(bbox, childBBox)) {
                if (node.leaf) { result.push(child); }
                else if (contains(bbox, childBBox)) { this._all(child, result); }
                else { nodesToSearch.push(child); }
            }
        }
        node = nodesToSearch.pop();
    }

    return result;
};

RBush.prototype.collides = function collides (bbox) {
    var node = this.data;

    if (!intersects(bbox, node)) { return false; }

    var nodesToSearch = [];
    while (node) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            var childBBox = node.leaf ? this.toBBox(child) : child;

            if (intersects(bbox, childBBox)) {
                if (node.leaf || contains(bbox, childBBox)) { return true; }
                nodesToSearch.push(child);
            }
        }
        node = nodesToSearch.pop();
    }

    return false;
};

RBush.prototype.load = function load (data) {
    if (!(data && data.length)) { return this; }

    if (data.length < this._minEntries) {
        for (var i = 0; i < data.length; i++) {
            this.insert(data[i]);
        }
        return this;
    }

    // recursively build the tree with the given data from scratch using OMT algorithm
    var node = this._build(data.slice(), 0, data.length - 1, 0);

    if (!this.data.children.length) {
        // save as is if tree is empty
        this.data = node;

    } else if (this.data.height === node.height) {
        // split root if trees have the same height
        this._splitRoot(this.data, node);

    } else {
        if (this.data.height < node.height) {
            // swap trees if inserted one is bigger
            var tmpNode = this.data;
            this.data = node;
            node = tmpNode;
        }

        // insert the small tree into the large tree at appropriate level
        this._insert(node, this.data.height - node.height - 1, true);
    }

    return this;
};

RBush.prototype.insert = function insert (item) {
    if (item) { this._insert(item, this.data.height - 1); }
    return this;
};

RBush.prototype.clear = function clear () {
    this.data = createNode([]);
    return this;
};

RBush.prototype.remove = function remove (item, equalsFn) {
    if (!item) { return this; }

    var node = this.data;
    var bbox = this.toBBox(item);
    var path = [];
    var indexes = [];
    var i, parent, goingUp;

    // depth-first iterative tree traversal
    while (node || path.length) {

        if (!node) { // go up
            node = path.pop();
            parent = path[path.length - 1];
            i = indexes.pop();
            goingUp = true;
        }

        if (node.leaf) { // check current node
            var index = findItem(item, node.children, equalsFn);

            if (index !== -1) {
                // item found, remove the item and condense tree upwards
                node.children.splice(index, 1);
                path.push(node);
                this._condense(path);
                return this;
            }
        }

        if (!goingUp && !node.leaf && contains(node, bbox)) { // go down
            path.push(node);
            indexes.push(i);
            i = 0;
            parent = node;
            node = node.children[0];

        } else if (parent) { // go right
            i++;
            node = parent.children[i];
            goingUp = false;

        } else { node = null; } // nothing found
    }

    return this;
};

RBush.prototype.toBBox = function toBBox (item) { return item; };

RBush.prototype.compareMinX = function compareMinX (a, b) { return a.minX - b.minX; };
RBush.prototype.compareMinY = function compareMinY (a, b) { return a.minY - b.minY; };

RBush.prototype.toJSON = function toJSON () { return this.data; };

RBush.prototype.fromJSON = function fromJSON (data) {
    this.data = data;
    return this;
};

RBush.prototype._all = function _all (node, result) {
    var nodesToSearch = [];
    while (node) {
        if (node.leaf) { result.push.apply(result, node.children); }
        else { nodesToSearch.push.apply(nodesToSearch, node.children); }

        node = nodesToSearch.pop();
    }
    return result;
};

RBush.prototype._build = function _build (items, left, right, height) {

    var N = right - left + 1;
    var M = this._maxEntries;
    var node;

    if (N <= M) {
        // reached leaf level; return leaf
        node = createNode(items.slice(left, right + 1));
        calcBBox(node, this.toBBox);
        return node;
    }

    if (!height) {
        // target height of the bulk-loaded tree
        height = Math.ceil(Math.log(N) / Math.log(M));

        // target number of root entries to maximize storage utilization
        M = Math.ceil(N / Math.pow(M, height - 1));
    }

    node = createNode([]);
    node.leaf = false;
    node.height = height;

    // split the items into M mostly square tiles

    var N2 = Math.ceil(N / M);
    var N1 = N2 * Math.ceil(Math.sqrt(M));

    multiSelect(items, left, right, N1, this.compareMinX);

    for (var i = left; i <= right; i += N1) {

        var right2 = Math.min(i + N1 - 1, right);

        multiSelect(items, i, right2, N2, this.compareMinY);

        for (var j = i; j <= right2; j += N2) {

            var right3 = Math.min(j + N2 - 1, right2);

            // pack each entry recursively
            node.children.push(this._build(items, j, right3, height - 1));
        }
    }

    calcBBox(node, this.toBBox);

    return node;
};

RBush.prototype._chooseSubtree = function _chooseSubtree (bbox, node, level, path) {
    while (true) {
        path.push(node);

        if (node.leaf || path.length - 1 === level) { break; }

        var minArea = Infinity;
        var minEnlargement = Infinity;
        var targetNode = (void 0);

        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            var area = bboxArea(child);
            var enlargement = enlargedArea(bbox, child) - area;

            // choose entry with the least area enlargement
            if (enlargement < minEnlargement) {
                minEnlargement = enlargement;
                minArea = area < minArea ? area : minArea;
                targetNode = child;

            } else if (enlargement === minEnlargement) {
                // otherwise choose one with the smallest area
                if (area < minArea) {
                    minArea = area;
                    targetNode = child;
                }
            }
        }

        node = targetNode || node.children[0];
    }

    return node;
};

RBush.prototype._insert = function _insert (item, level, isNode) {
    var bbox = isNode ? item : this.toBBox(item);
    var insertPath = [];

    // find the best node for accommodating the item, saving all nodes along the path too
    var node = this._chooseSubtree(bbox, this.data, level, insertPath);

    // put the item into the node
    node.children.push(item);
    extend(node, bbox);

    // split on node overflow; propagate upwards if necessary
    while (level >= 0) {
        if (insertPath[level].children.length > this._maxEntries) {
            this._split(insertPath, level);
            level--;
        } else { break; }
    }

    // adjust bboxes along the insertion path
    this._adjustParentBBoxes(bbox, insertPath, level);
};

// split overflowed node into two
RBush.prototype._split = function _split (insertPath, level) {
    var node = insertPath[level];
    var M = node.children.length;
    var m = this._minEntries;

    this._chooseSplitAxis(node, m, M);

    var splitIndex = this._chooseSplitIndex(node, m, M);

    var newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
    newNode.height = node.height;
    newNode.leaf = node.leaf;

    calcBBox(node, this.toBBox);
    calcBBox(newNode, this.toBBox);

    if (level) { insertPath[level - 1].children.push(newNode); }
    else { this._splitRoot(node, newNode); }
};

RBush.prototype._splitRoot = function _splitRoot (node, newNode) {
    // split root node
    this.data = createNode([node, newNode]);
    this.data.height = node.height + 1;
    this.data.leaf = false;
    calcBBox(this.data, this.toBBox);
};

RBush.prototype._chooseSplitIndex = function _chooseSplitIndex (node, m, M) {
    var index;
    var minOverlap = Infinity;
    var minArea = Infinity;

    for (var i = m; i <= M - m; i++) {
        var bbox1 = distBBox(node, 0, i, this.toBBox);
        var bbox2 = distBBox(node, i, M, this.toBBox);

        var overlap = intersectionArea(bbox1, bbox2);
        var area = bboxArea(bbox1) + bboxArea(bbox2);

        // choose distribution with minimum overlap
        if (overlap < minOverlap) {
            minOverlap = overlap;
            index = i;

            minArea = area < minArea ? area : minArea;

        } else if (overlap === minOverlap) {
            // otherwise choose distribution with minimum area
            if (area < minArea) {
                minArea = area;
                index = i;
            }
        }
    }

    return index || M - m;
};

// sorts node children by the best axis for split
RBush.prototype._chooseSplitAxis = function _chooseSplitAxis (node, m, M) {
    var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX;
    var compareMinY = node.leaf ? this.compareMinY : compareNodeMinY;
    var xMargin = this._allDistMargin(node, m, M, compareMinX);
    var yMargin = this._allDistMargin(node, m, M, compareMinY);

    // if total distributions margin value is minimal for x, sort by minX,
    // otherwise it's already sorted by minY
    if (xMargin < yMargin) { node.children.sort(compareMinX); }
};

// total margin of all possible split distributions where each node is at least m full
RBush.prototype._allDistMargin = function _allDistMargin (node, m, M, compare) {
    node.children.sort(compare);

    var toBBox = this.toBBox;
    var leftBBox = distBBox(node, 0, m, toBBox);
    var rightBBox = distBBox(node, M - m, M, toBBox);
    var margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

    for (var i = m; i < M - m; i++) {
        var child = node.children[i];
        extend(leftBBox, node.leaf ? toBBox(child) : child);
        margin += bboxMargin(leftBBox);
    }

    for (var i$1 = M - m - 1; i$1 >= m; i$1--) {
        var child$1 = node.children[i$1];
        extend(rightBBox, node.leaf ? toBBox(child$1) : child$1);
        margin += bboxMargin(rightBBox);
    }

    return margin;
};

RBush.prototype._adjustParentBBoxes = function _adjustParentBBoxes (bbox, path, level) {
    // adjust bboxes along the given tree path
    for (var i = level; i >= 0; i--) {
        extend(path[i], bbox);
    }
};

RBush.prototype._condense = function _condense (path) {
    // go through the path, removing empty nodes and updating bboxes
    for (var i = path.length - 1, siblings = (void 0); i >= 0; i--) {
        if (path[i].children.length === 0) {
            if (i > 0) {
                siblings = path[i - 1].children;
                siblings.splice(siblings.indexOf(path[i]), 1);

            } else { this.clear(); }

        } else { calcBBox(path[i], this.toBBox); }
    }
};

function findItem(item, items, equalsFn) {
    if (!equalsFn) { return items.indexOf(item); }

    for (var i = 0; i < items.length; i++) {
        if (equalsFn(item, items[i])) { return i; }
    }
    return -1;
}

// calculate node's bbox from bboxes of its children
function calcBBox(node, toBBox) {
    distBBox(node, 0, node.children.length, toBBox, node);
}

// min bounding rectangle of node children from k to p-1
function distBBox(node, k, p, toBBox, destNode) {
    if (!destNode) { destNode = createNode(null); }
    destNode.minX = Infinity;
    destNode.minY = Infinity;
    destNode.maxX = -Infinity;
    destNode.maxY = -Infinity;

    for (var i = k; i < p; i++) {
        var child = node.children[i];
        extend(destNode, node.leaf ? toBBox(child) : child);
    }

    return destNode;
}

function extend(a, b) {
    a.minX = Math.min(a.minX, b.minX);
    a.minY = Math.min(a.minY, b.minY);
    a.maxX = Math.max(a.maxX, b.maxX);
    a.maxY = Math.max(a.maxY, b.maxY);
    return a;
}

function compareNodeMinX(a, b) { return a.minX - b.minX; }
function compareNodeMinY(a, b) { return a.minY - b.minY; }

function bboxArea(a)   { return (a.maxX - a.minX) * (a.maxY - a.minY); }
function bboxMargin(a) { return (a.maxX - a.minX) + (a.maxY - a.minY); }

function enlargedArea(a, b) {
    return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
           (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
}

function intersectionArea(a, b) {
    var minX = Math.max(a.minX, b.minX);
    var minY = Math.max(a.minY, b.minY);
    var maxX = Math.min(a.maxX, b.maxX);
    var maxY = Math.min(a.maxY, b.maxY);

    return Math.max(0, maxX - minX) *
           Math.max(0, maxY - minY);
}

function contains(a, b) {
    return a.minX <= b.minX &&
           a.minY <= b.minY &&
           b.maxX <= a.maxX &&
           b.maxY <= a.maxY;
}

function intersects(a, b) {
    return b.minX <= a.maxX &&
           b.minY <= a.maxY &&
           b.maxX >= a.minX &&
           b.maxY >= a.minY;
}

function createNode(children) {
    return {
        children: children,
        height: 1,
        leaf: true,
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity
    };
}

// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
// combines selection algorithm with binary divide & conquer approach

function multiSelect(arr, left, right, n, compare) {
    var stack = [left, right];

    while (stack.length) {
        right = stack.pop();
        left = stack.pop();

        if (right - left <= n) { continue; }

        var mid = left + Math.ceil((right - left) / n / 2) * n;
        quickselect(arr, mid, left, right, compare);

        stack.push(left, mid, mid, right);
    }
}

export default RBush;
