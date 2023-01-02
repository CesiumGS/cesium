import { Queue } from "../../index.js";

describe("Core/Queue", function () {
  let queue;
  beforeEach(function () {
    queue = new Queue();
  });

  it("can enqueue and dequeue items", function () {
    queue.enqueue(1);
    queue.enqueue("a");
    queue.enqueue(null);

    expect(queue.dequeue()).toEqual(1);
    expect(queue.dequeue()).toEqual("a");
    expect(queue.dequeue()).toEqual(null);
  });

  it("returns undefined when dequeueing while empty", function () {
    expect(queue.dequeue()).toBeUndefined();
  });

  it("updates length when enqueuing and dequeuing", function () {
    expect(queue.length).toEqual(0);

    queue.enqueue("a");
    expect(queue.length).toEqual(1);

    queue.dequeue();
    expect(queue.length).toEqual(0);
  });

  it("compacts underlying array", function () {
    let i;
    for (i = 0; i < 1000; i++) {
      queue.enqueue(i);
    }
    for (i = 0; i < 1000; i++) {
      queue.dequeue();
    }

    expect(queue._array.length).toBeLessThan(1000);
  });

  it("can peek at the item at the head of the queue", function () {
    queue.enqueue(1);
    queue.enqueue(2);

    expect(queue.peek()).toEqual(1);
    expect(queue.length).toEqual(2);
  });

  it("returns undefined when peeking while empty", function () {
    expect(queue.peek()).toBeUndefined();
  });

  it("can check if it contains an item", function () {
    queue.enqueue(1);

    expect(queue.contains(1)).toEqual(true);
    expect(queue.contains(2)).toEqual(false);
  });

  it("can clear items", function () {
    queue.enqueue(1);
    queue.enqueue(2);

    queue.clear();

    expect(queue.length).toEqual(0);
  });

  it("can sort items", function () {
    queue.enqueue(99);
    queue.enqueue(6);
    queue.enqueue(1);
    queue.enqueue(53);
    queue.enqueue(4);
    queue.enqueue(0);

    queue.dequeue(); //remove 99

    queue.sort(function (a, b) {
      return a - b;
    });

    expect(queue.dequeue()).toEqual(0);
    expect(queue.dequeue()).toEqual(1);
    expect(queue.dequeue()).toEqual(4);
    expect(queue.dequeue()).toEqual(6);
    expect(queue.dequeue()).toEqual(53);
  });
});
