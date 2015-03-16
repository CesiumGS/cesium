
var EventEmitter = require('events').EventEmitter
var assert = require('assert')

var first = require('./')

describe('first', function () {
  var ee1 = new EventEmitter()
  var ee2 = new EventEmitter()
  var ee3 = new EventEmitter()

  it('should emit the first event', function (done) {
    first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c'],
    ], function (err, ee, event, args) {
      assert.ifError(err)
      assert.equal(ee, ee2)
      assert.equal(event, 'b')
      assert.deepEqual(args, [1, 2, 3])
      done()
    })

    ee2.emit('b', 1, 2, 3)
  })

  it('it should return an error if event === error', function (done) {
    first([
      [ee1, 'error', 'b', 'c'],
      [ee2, 'error', 'b', 'c'],
      [ee3, 'error', 'b', 'c'],
    ], function (err, ee, event, args) {
      assert.equal(err.message, 'boom')
      assert.equal(ee, ee3)
      assert.equal(event, 'error')
      done()
    })

    ee3.emit('error', new Error('boom'))
  })

  it('should cleanup after itself', function (done) {
    first([
      [ee1, 'a', 'b', 'c'],
      [ee2, 'a', 'b', 'c'],
      [ee3, 'a', 'b', 'c'],
    ], function (err, ee, event, args) {
      assert.ifError(err)
      ;[ee1, ee2, ee3].forEach(function (ee) {
        ['a', 'b', 'c'].forEach(function (event) {
          assert(!ee.listeners(event).length)
        })
      })
      done()
    })

    ee1.emit('a')
  })
})
