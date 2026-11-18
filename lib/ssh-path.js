function quoteShellArgument(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function remotePathExpression(value) {
  const target = String(value || ".");
  if (target === "~") return '"$HOME"';
  if (target.startsWith("~/")) return `"$HOME"${quoteShellArgument(target.slice(1))}`;
  return quoteShellArgument(target);
}

module.exports = { quoteShellArgument, remotePathExpression };
