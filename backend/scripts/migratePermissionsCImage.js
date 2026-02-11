import db from "../config/db.js";

const migratePermissions = async () => {
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    console.log("🚀 Starting Permission Migration for Product Images...");

    // 1. Define Permissions
    const permissions = [
      { name: "product.image.view", description: "Melihat foto produk" },
      { name: "product.image.upload", description: "Upload/Ganti foto produk" },
      { name: "product.image.delete", description: "Menghapus foto produk" },
    ];

    // 2. Insert Permissions if not exists
    for (const perm of permissions) {
      const [existing] = await connection.query("SELECT id FROM permissions WHERE name = ?", [perm.name]);
      if (existing.length === 0) {
        await connection.query("INSERT INTO permissions (name, description) VALUES (?, ?)", [perm.name, perm.description]);
        console.log(`✅ Permission created: ${perm.name}`);
      } else {
        console.log(`ℹ️ Permission already exists: ${perm.name}`);
      }
    }

    // 3. Get Role IDs
    const [roles] = await connection.query("SELECT id, name FROM roles");
    const roleMap = {};
    roles.forEach(r => roleMap[r.name.toLowerCase()] = r.id);

    // 4. Assign Permissions to Roles
    // Mapping: Role -> [Permissions]
    // Admin: ALL
    // Sales, CS: View, Upload

    // Helper to assign
    const assign = async (roleName, permNames) => {
      const roleId = roleMap[roleName.toLowerCase()];
      if (!roleId) return console.warn(`⚠️ Role not found: ${roleName}`);

      for (const permName of permNames) {
        const [permRow] = await connection.query("SELECT id FROM permissions WHERE name = ?", [permName]);
        if (permRow.length === 0) continue;
        const permId = permRow[0].id;

        // Check mapping
        const [exists] = await connection.query("SELECT 1 FROM role_permission WHERE role_id = ? AND permission_id = ?", [roleId, permId]);
        if (exists.length === 0) {
          await connection.query("INSERT INTO role_permission (role_id, permission_id) VALUES (?, ?)", [roleId, permId]);
          console.log(`   ➕ Assigned '${permName}' to '${roleName}'`);
        }
      }
    };

    // Execute Assignments
    const allPerms = permissions.map(p => p.name);
    const limitedPerms = ["product.image.view", "product.image.upload"];

    await assign("admin", allPerms);
    await assign("superadmin", allPerms); // Assuming superadmin exists
    await assign("sales", limitedPerms);
    await assign("cs", limitedPerms);

    await connection.commit();
    console.log("✅ Migration permissions completed successfully.");
  } catch (error) {
    await connection.rollback();
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
};

migratePermissions();
