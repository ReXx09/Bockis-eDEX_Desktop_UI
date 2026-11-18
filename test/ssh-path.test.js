const test = require("node:test");
const assert = require("node:assert/strict");
const { quoteShellArgument, remotePathExpression } = require("../lib/ssh-path");

test("Quotes SSH paths as literal shell arguments", () => {
  assert.equal(quoteShellArgument("folder/$draft`name"), "'folder/$draft`name'");
  assert.equal(quoteShellArgument("a'b"), "'a'\\''b'");
  assert.equal(remotePathExpression("~/folder with $draft"), '"$HOME"\'/folder with $draft\'');
  assert.equal(remotePathExpression("~"), '"$HOME"');
});
