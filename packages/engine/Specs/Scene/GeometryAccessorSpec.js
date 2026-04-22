describe("Scene/GeometryAccessor", function () {
  describe("session lifecycle", function () {
    it("acquires resources on construction of a session", function () {});

    it("destroys the session after a successful callback", function () {});

    it("destroys the session and rethrows when the callback throws", function () {});
  });

  describe("topology access control", function () {
    it("rejects topology reads when read topology access was not requested", function () {});

    it("rejects topology writes when write topology access was not requested", function () {});

    it("allows topology reads when read topology access was requested", function () {});

    it("allows topology writes when write topology access was requested", function () {});
  });

  describe("vertex attribute access control", function () {
    it("grants attribute read access only for an exact descriptor match", function () {});

    it("grants attribute write access only for an exact descriptor match", function () {});

    it("warns and leaves geometry unchanged for unauthorized attribute access", function () {});
  });
});
