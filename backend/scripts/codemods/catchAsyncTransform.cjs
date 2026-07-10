module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  let hasModifications = false;
  let catchAsyncImported = false;

  // Cek apakah catchAsync sudah diimport
  root.find(j.ImportDeclaration).forEach((path) => {
    if (path.node.source.value.includes("catchAsync")) {
      catchAsyncImported = true;
    }
  });

  // Cari semua `export const something = async (...) => { ... }`
  root.find(j.VariableDeclarator, {
    init: {
      type: "ArrowFunctionExpression",
      async: true,
    },
  }).forEach((path) => {
    const arrowFn = path.node.init;
    const body = arrowFn.body;

    // Pastikan body adalah BlockStatement
    if (body.type === "BlockStatement") {
      // Periksa apakah hanya ada satu statement dan itu adalah TryStatement
      const statements = body.body;
      if (statements.length === 1 && statements[0].type === "TryStatement") {
        const tryStmt = statements[0];
        const catchClause = tryStmt.handler;

        // Pastikan catch block ada dan hanya memiliki pemanggilan next(error)
        if (catchClause && catchClause.body.body.length === 1) {
          const catchBodyStmt = catchClause.body.body[0];
          
          if (
            catchBodyStmt.type === "ExpressionStatement" &&
            catchBodyStmt.expression.type === "CallExpression" &&
            catchBodyStmt.expression.callee.name === "next"
          ) {
            // Ganti isi fungsi dengan isi dari blok `try`
            arrowFn.body = tryStmt.block;
            
            // Bungkus arrow function dengan catchAsync()
            const wrappedFn = j.callExpression(j.identifier("catchAsync"), [arrowFn]);
            
            // Perbarui inisialisasi variabel dengan fungsi yang dibungkus
            path.node.init = wrappedFn;
            
            hasModifications = true;
          }
        }
      }
    }
  });

  // Jika ada perubahan dan catchAsync belum diimport, tambahkan import
  if (hasModifications && !catchAsyncImported) {
    const importStmt = j.importDeclaration(
      [j.importDefaultSpecifier(j.identifier("catchAsync"))],
      j.literal("../utils/catchAsync.js")
    );
    
    // Cari import pertama untuk disisipkan sebelumnya, atau taruh di paling atas
    const imports = root.find(j.ImportDeclaration);
    if (imports.length > 0) {
      imports.at(0).insertBefore(importStmt);
    } else {
      root.get().node.program.body.unshift(importStmt);
    }
  }

  // toSource bisa ditambahkan opsi jika perlu, misal: { quote: 'single' }
  return hasModifications ? root.toSource() : null;
};
