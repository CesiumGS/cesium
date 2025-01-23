import defined from "./defined.js";

/**
 * @private
 */
function DoublyLinkedList() {
  this.head = undefined;
  this.tail = undefined;
  this._length = 0;
}

Object.defineProperties(DoublyLinkedList.prototype, {
  length: {
    get: function () {
      return this._length;
    },
  },
});

/**
 * @private
 */
function DoublyLinkedListNode(item, previous, next) {
  this.item = item;
  this.previous = previous;
  this.next = next;
}

/**
 * Adds the item to the end of the list
 * @param {*} [item]
 * @return {DoublyLinkedListNode}
 */
DoublyLinkedList.prototype.add = function (item) {
  const node = new DoublyLinkedListNode(item, this.tail, undefined);

  if (defined(this.tail)) {
    this.tail.next = node;
    this.tail = node;
  } else {
    this.head = node;
    this.tail = node;
  }

  ++this._length;

  return node;
};

function remove(list, node) {
  if (defined(node.previous) && defined(node.next)) {
    node.previous.next = node.next;
    node.next.previous = node.previous;
  } else if (defined(node.previous)) {
    // Remove last node
    node.previous.next = undefined;
    list.tail = node.previous;
  } else if (defined(node.next)) {
    // Remove first node
    node.next.previous = undefined;
    list.head = node.next;
  } else {
    // Remove last node in the linked list
    list.head = undefined;
    list.tail = undefined;
  }

  node.next = undefined;
  node.previous = undefined;
}

/**
 * Removes the given node from the list
 * @param {DoublyLinkedListNode} node
 */
DoublyLinkedList.prototype.remove = function (node) {
  if (!defined(node)) {
    return;
  }

  remove(this, node);

  --this._length;
};

/**
 * Moves nextNode after node
 * @param {DoublyLinkedListNode} node
 * @param {DoublyLinkedListNode} nextNode
 */
DoublyLinkedList.prototype.splice = function (node, nextNode) {
  if (node === nextNode) {
    return;
  }

  // Remove nextNode, then insert after node
  remove(this, nextNode);

  const oldNodeNext = node.next;
  node.next = nextNode;

  // nextNode is the new tail
  if (this.tail === node) {
    this.tail = nextNode;
  } else {
    oldNodeNext.previous = nextNode;
  }

  nextNode.next = oldNodeNext;
  nextNode.previous = node;
};
export default DoublyLinkedList;
