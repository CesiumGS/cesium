import defined from "../Core/defined.js";

/**
 * NetworkLinkUpdateMgr keeps track kmls that are loaded from network links so that
 * they can be updated later.
 *
 * When an 'Update' link is loaded, the manager will use the link's targetHref to
 * find the stored kml and updated it.
 */
export default function NetworkLinkUpdateMgr() {
  this._links = {};
  this._sourceToUrl = {};
}

NetworkLinkUpdateMgr.prototype.addLink = function (href, kml, dataSource) {
  this._links[href.request.url] = {
    kml: kml,
    dataSource: dataSource,
  };
  this._sourceToUrl[dataSource] = href.request.url;
};

NetworkLinkUpdateMgr.prototype.processUpdate = function (updateNode) {
  processUpdate(this._links, updateNode);
};

NetworkLinkUpdateMgr.prototype.removeLink = function (dataSource) {
  var url = this._sourceToUrl[dataSource];
  delete this._links[url];
  delete this._sourceToUrl[dataSource];
};

function processUpdate(links, updateNode) {
  var link = links[getUpdateTargetHref(updateNode)];
  if (!defined(link)) return;

  processUpdateNode(link.kml, updateNode);
  link.dataSource.load(link.kml).then(function () {
    link.dataSource._changed.raiseEvent(link);
  });
}

function getUpdateTargetHref(updateNode) {
  var elements = updateNode.getElementsByTagName("targetHref");
  if (elements.length > 0) return elements[0].innerHTML;

  return undefined;
}

function processUpdateNode(kmlRoot, updateNode) {
  forEachChild(updateNode, function (child) {
    switch (child.tagName) {
      case "Change":
        processChangeNodes(kmlRoot, child);
        break;
      case "Create":
        processCreateNodes(kmlRoot, child);
        break;
      case "Delete":
        processDeleteNode(kmlRoot, child);
        break;
    }
  });
}

function processChangeNodes(root, changeNode) {
  forEachChild(changeNode, function (child) {
    processChangeNode(root, child);
  });
}

function processChangeNode(root, newNode) {
  var oldNode = root.getElementById(newNode.getAttribute("targetId"));
  if (!defined(oldNode)) return;

  forEachChild(newNode, function (newProp) {
    var oldProp = oldNode.getElementsByTagName(newProp.tagName)[0];
    if (!defined(oldProp)) return;

    oldNode.replaceChild(newProp, oldProp);
  });
}

function processCreateNodes(root, createNode) {
  forEachChild(createNode, function (child) {
    processCreateNode(root, child);
  });
}

function processCreateNode(root, newParent) {
  var oldParent = root.getElementById(newParent.getAttribute("targetId"));
  if (!defined(oldParent)) return;

  forEachChild(newParent, function (child) {
    oldParent.appendChild(child);
  });
}

function processDeleteNode(root, deleteNode) {
  forEachChild(deleteNode, function (child) {
    var nodeToDelete = root.getElementById(child.getAttribute("targetId"));
    if (!defined(nodeToDelete)) return;

    nodeToDelete.parentNode.removeChild(nodeToDelete);
  });
}

function forEachChild(parent, callback) {
  if (!defined(parent.children)) return;

  var children = copyNodes(parent.children);

  for (var i = 0; i < children.length; i++) {
    callback(children[i]);
  }
}

function copyNodes(nodes) {
  var copy = new Array(nodes.length);
  for (var i = 0; i < copy.length; i++) {
    copy[i] = nodes[i];
  }
}
