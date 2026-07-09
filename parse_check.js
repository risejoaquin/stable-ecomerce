import ts from 'typescript';
import fs from 'fs';

const code = fs.readFileSync('server.ts', 'utf-8');
const sourceFile = ts.createSourceFile('server.ts', code, ts.ScriptTarget.Latest, true);

function traverse(node) {
  if (node.kind === ts.SyntaxKind.TryStatement) {
     if (!node.catchClause && !node.finallyBlock) {
         console.log("Missing catch/finally at pos: ", node.pos);
     }
  }
  ts.forEachChild(node, traverse);
}
traverse(sourceFile);
