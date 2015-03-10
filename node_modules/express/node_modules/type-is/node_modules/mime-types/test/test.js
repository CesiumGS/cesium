
var assert = require('assert')

var mime = require('..')

var lookup = mime.lookup
var extension = mime.extension
var charset = mime.charset
var contentType = mime.contentType

describe('.lookup()', function () {

  it('jade', function () {
    assert.equal(lookup('jade'), 'text/jade')
    assert.equal(lookup('.jade'), 'text/jade')
    assert.equal(lookup('file.jade'), 'text/jade')
    assert.equal(lookup('folder/file.jade'), 'text/jade')
  })

  it('should not error on non-string types', function () {
    assert.doesNotThrow(function () {
      lookup({ noteven: "once" })
      lookup(null)
      lookup(true)
      lookup(Infinity)
    })
  })

  it('should return false for unknown types', function () {
    assert.equal(lookup('.jalksdjflakjsdjfasdf'), false)
  })
})

describe('.extension()', function () {

  it('should not error on non-string types', function () {
    assert.doesNotThrow(function () {
      extension({ noteven: "once" })
      extension(null)
      extension(true)
      extension(Infinity)
    })
  })

  it('should return false for unknown types', function () {
    assert.equal(extension('.jalksdjflakjsdjfasdf'), false)
  })
})

describe('.charset()', function () {

  it('should not error on non-string types', function () {
    assert.doesNotThrow(function () {
      charset({ noteven: "once" })
      charset(null)
      charset(true)
      charset(Infinity)
    })
  })

  it('should return false for unknown types', function () {
    assert.equal(charset('.jalksdjflakjsdjfasdf'), false)
  })
})

describe('.contentType()', function () {

  it('html', function () {
    assert.equal(contentType('html'), 'text/html; charset=utf-8')
  })

  it('text/html; charset=ascii', function () {
    assert.equal(contentType('text/html; charset=ascii'), 'text/html; charset=ascii')
  })

  it('json', function () {
    assert.equal(contentType('json'), 'application/json; charset=utf-8')
  })

  it('application/json', function () {
    assert.equal(contentType('application/json'), 'application/json; charset=utf-8')
  })

  it('jade', function () {
    assert.equal(contentType('jade'), 'text/jade; charset=utf-8')
  })

  it('should not error on non-string types', function () {
    assert.doesNotThrow(function () {
      contentType({ noteven: "once" })
      contentType(null)
      contentType(true)
      contentType(Infinity)
    })
  })

  it('should return false for unknown types', function () {
    assert.equal(contentType('.jalksdjflakjsdjfasdf'), false)
  })
})
