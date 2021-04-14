/*
var x = {
 schema: {
   classes: {
     _batchTable: {
       properties: {}
     }
   },
   featureTables: {
     _batchTable: {
       class: "_batchTable",
       count: 10
       properties: {}
     }
   }
 }
};
*/

describe("Scene/parseBatchTable", function () {
  /*
  var batchTableJson = {
  };

  var binaryBody = new Uint8Array();
  var count = 3;
  */

  it("throws without count", function () {
    fail();
    /*
    expect(function() {
      return parseBatchTable({
        count: undefined,
        binaryBody: binaryBody
      });
    }).toThrowDeveloperError();
    */
  });

  it("throws without batchTable", function () {
    fail();
  });

  it("throws without binary body", function () {
    fail();
  });

  it("warns for deprecated HIERARCHY extension", function () {
    fail();
  });

  it("parses batch table with no properties", function () {
    fail();
  });

  it("parses batch table with binary properties", function () {
    fail();
  });

  it("transcodes scalars to correct types", function () {
    fail();
  });

  it("transcodes binary vectors to array types", function () {
    fail();
  });

  it("parses batch table with JSON properties", function () {
    fail();
  });

  it("parses batch table with hierarchy", function () {
    fail();
  });

  it("stores extras and extensions in the transcoded FeatureTable", function () {
    fail();
  });
});
