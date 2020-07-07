import { DoublyLinkedList } from "../../Source/Cesium.js";

describe("Core/DoublyLinkedList", function () {
  it("constructs", function () {
    var list = new DoublyLinkedList();
    expect(list.head).not.toBeDefined();
    expect(list.tail).not.toBeDefined();
    expect(list.length).toEqual(0);
  });

  it("adds items", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);

    //   node
    //  ^     ^
    //  |     |
    // head  tail
    expect(list.head).toEqual(node);
    expect(list.tail).toEqual(node);
    expect(list.length).toEqual(1);

    expect(node).toBeDefined();
    expect(node.item).toEqual(1);
    expect(node.previous).not.toBeDefined();
    expect(node.next).not.toBeDefined();

    var node2 = list.add(2);

    //  node <-> node2
    //  ^         ^
    //  |         |
    // head      tail
    expect(list.head).toEqual(node);
    expect(list.tail).toEqual(node2);
    expect(list.length).toEqual(2);

    expect(node2).toBeDefined();
    expect(node2.item).toEqual(2);
    expect(node2.previous).toEqual(node);
    expect(node2.next).not.toBeDefined();

    expect(node.next).toEqual(node2);

    var node3 = list.add(3);

    //  node <-> node2 <-> node3
    //  ^                    ^
    //  |                    |
    // head                 tail
    expect(list.head).toEqual(node);
    expect(list.tail).toEqual(node3);
    expect(list.length).toEqual(3);

    expect(node3).toBeDefined();
    expect(node3.item).toEqual(3);
    expect(node3.previous).toEqual(node2);
    expect(node3.next).not.toBeDefined();

    expect(node2.next).toEqual(node3);
  });

  it("removes from a list with one item", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);

    list.remove(node);

    expect(list.head).not.toBeDefined();
    expect(list.tail).not.toBeDefined();
    expect(list.length).toEqual(0);
  });

  it("removes head of list", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);

    list.remove(node);

    expect(list.head).toEqual(node2);
    expect(list.tail).toEqual(node2);
    expect(list.length).toEqual(1);
  });

  it("removes tail of list", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);

    list.remove(node2);

    expect(list.head).toEqual(node);
    expect(list.tail).toEqual(node);
    expect(list.length).toEqual(1);
  });

  it("removes middle of list", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);

    list.remove(node2);

    expect(list.head).toEqual(node);
    expect(list.tail).toEqual(node3);
    expect(list.length).toEqual(2);
  });

  it("removes nothing", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);

    list.remove(undefined);

    expect(list.head).toEqual(node);
    expect(list.tail).toEqual(node);
    expect(list.length).toEqual(1);
  });

  function expectOrder(list, nodes) {
    // Assumes at least one node is in the list
    var length = nodes.length;

    expect(list.length).toEqual(length);

    // Verify head and tail pointers
    expect(list.head).toEqual(nodes[0]);
    expect(list.tail).toEqual(nodes[length - 1]);

    // Verify that linked list has nodes in the expected order
    var node = list.head;
    for (var i = 0; i < length; ++i) {
      var nextNode = i === length - 1 ? undefined : nodes[i + 1];
      var previousNode = i === 0 ? undefined : nodes[i - 1];

      expect(node).toEqual(nodes[i]);
      expect(node.next).toEqual(nextNode);
      expect(node.previous).toEqual(previousNode);

      node = node.next;
    }
  }

  it("splices nextNode before node", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);
    var node5 = list.add(5);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4 <-> node5
    //  ^          ^                   ^          ^
    //  |          |                   |          |
    // head     nextNode             node        tail

    // After:
    //
    //  node <-> node3 <-> node4 <-> node2 <-> node5
    //  ^                                         ^
    //  |                                         |
    // head                                      tail

    // Move node2 after node4
    list.splice(node4, node2);
    expectOrder(list, [node, node3, node4, node2, node5]);
  });

  it("splices nextNode after node", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);
    var node5 = list.add(5);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4 <-> node5
    //  ^          ^                   ^          ^
    //  |          |                   |          |
    // head      node              nextNode      tail

    // After:
    //
    //  node <-> node2 <-> node4 <-> node3 <-> node5
    //  ^                                         ^
    //  |                                         |
    // head                                      tail

    // Move node4 after node2
    list.splice(node2, node4);
    expectOrder(list, [node, node2, node4, node3, node5]);
  });

  it("splices nextNode immediately before node", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4
    //  ^          ^         ^         ^
    //  |          |         |         |
    // head     nextNode    node      tail

    // After:
    //
    //  node <-> node3 <-> node2 <-> node4
    //  ^                              ^
    //  |                              |
    // head                           tail

    // Move node2 after node4
    list.splice(node3, node2);
    expectOrder(list, [node, node3, node2, node4]);
  });

  it("splices nextNode immediately after node", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4
    //  ^          ^         ^         ^
    //  |          |         |         |
    // head      node    nextNode     tail

    // After: does not change

    list.splice(node2, node3);
    expectOrder(list, [node, node2, node3, node4]);
  });

  it("splices node === nextNode", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);

    // Before:
    //
    //  node <-> node2 <-> node3
    //  ^          ^         ^
    //  |          |         |
    // head  node/nextNode  tail

    // After: does not change

    list.splice(node2, node2);
    expectOrder(list, [node, node2, node3]);
  });

  it("splices when nextNode was tail", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4
    //  ^          ^                   ^
    //  |          |                   |
    // head      node           tail/nextNode

    // After:
    //
    //  node <-> node2 <-> node4 <-> node3
    //  ^                               ^
    //  |                               |
    // head                            tail

    list.splice(node2, node4);
    expectOrder(list, [node, node2, node4, node3]);
  });

  it("splices when node was tail", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4
    //  ^          ^                   ^
    //  |          |                   |
    // head      nextNode           tail/node

    // After:
    //
    //  node <-> node3 <-> node4 <-> node2
    //  ^                              ^
    //  |                              |
    // head                         tail/node

    list.splice(node4, node2);
    expectOrder(list, [node, node3, node4, node2]);
  });

  it("splices when nextNode was head", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4
    //  ^                   ^         ^
    //  |                   |         |
    // head/nextNode       node      tail

    // After:
    //
    //  node2 <-> node3 <-> node <-> node4
    //  ^                              ^
    //  |                              |
    // head                           tail

    list.splice(node3, node);
    expectOrder(list, [node2, node3, node, node4]);
  });

  it("splices when node was head", function () {
    var list = new DoublyLinkedList();
    var node = list.add(1);
    var node2 = list.add(2);
    var node3 = list.add(3);
    var node4 = list.add(4);

    // Before:
    //
    //  node <-> node2 <-> node3 <-> node4
    //  ^                   ^         ^
    //  |                   |         |
    // head/node        nextNode      tail

    // After:
    //
    //  node <-> node3 <-> node2 <-> node4
    //  ^                              ^
    //  |                              |
    // head                           tail

    list.splice(node, node3);
    expectOrder(list, [node, node3, node2, node4]);
  });
});
