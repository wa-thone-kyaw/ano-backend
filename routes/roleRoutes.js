const express = require("express");
const router = express.Router();
const { executeQuery } = require("../config/db");

// Route to create a new role
router.post("/", async (req, res) => {
  const { name } = req.body;
  try {
    const query = "INSERT INTO roles (name) VALUES (?)";
    const result = await executeQuery(query, [name]);
    res
      .status(201)
      .json({ message: "Role created successfully", roleId: result.insertId });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "development"
          ? `Failed to create role: ${error.message}`
          : "Failed to create role",
    });
  }
});

// Route to get all roles
router.get("/", async (req, res) => {
  try {
    const roles = await executeQuery("SELECT * FROM roles");
    res.json(roles);
  } catch (error) {
    console.error("Error retrieving roles:", error);
    res.status(500).json({ error: "Failed to retrieve roles" });
  }
});

// Route to update a role by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const query = "UPDATE roles SET name = ? WHERE id = ?";
    await executeQuery(query, [name, id]);
    res.json({ message: "Role updated successfully" });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Route to delete a role by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await executeQuery("DELETE FROM roles WHERE id = ?", [id]);
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

// Route to create a new permission
router.post("/permissions", async (req, res) => {
  const { name } = req.body;
  try {
    const query = "INSERT INTO permissions (name) VALUES (?)";
    const result = await executeQuery(query, [name]);
    res.status(201).json({
      message: "Permission created successfully",
      permissionId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating permission:", error);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "development"
          ? `Failed to create permission: ${error.message}`
          : "Failed to create permission",
    });
  }
});

// Route to get all permissions
router.get("/permissions", async (req, res) => {
  try {
    const permissions = await executeQuery("SELECT * FROM permissions");
    res.json(permissions);
  } catch (error) {
    console.error("Error retrieving permissions:", error);
    res.status(500).json({ error: "Failed to retrieve permissions" });
  }
});

router.get("/:id/permissions", async (req, res) => {
  const { id } = req.params;
  try {
    const permissions = await executeQuery(
      `SELECT permissions.id, permissions.name
       FROM permissions
       INNER JOIN role_permissions ON permissions.id = role_permissions.permission_id
       WHERE role_permissions.role_id = ?`,
      [id]
    );
    res.json(permissions);
  } catch (error) {
    console.error("Error retrieving role permissions:", error);
    res.status(500).json({ error: "Failed to retrieve role permissions" });
  }
});

// Updated route to assign permissions to a role
router.post("/:id/permissions", async (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;
  try {
    // Insert only non-existing permissions
    for (const permissionId of permissionIds) {
      await executeQuery(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT ?, ? FROM DUAL
         WHERE NOT EXISTS (
           SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?
         )`,
        [id, permissionId, id, permissionId]
      );
    }
    res
      .status(201)
      .json({ message: "Permissions assigned to role successfully" });
  } catch (error) {
    console.error("Error assigning permissions:", error);
    res.status(500).json({ error: "Failed to assign permissions to role" });
  }
});
// Route to get all roles with permissions
router.get("/roles-with-permissions", async (req, res) => {
  try {
    const rolesWithPermissions = await executeQuery(`
      SELECT roles.id AS role_id, roles.name AS role_name, permissions.id AS permission_id, permissions.name AS permission_name
      FROM roles
      LEFT JOIN role_permissions ON roles.id = role_permissions.role_id
      LEFT JOIN permissions ON role_permissions.permission_id = permissions.id
      ORDER BY roles.id;
    `);

    // Group permissions by role
    const rolesMap = rolesWithPermissions.reduce((acc, row) => {
      const { role_id, role_name, permission_id, permission_name } = row;
      if (!acc[role_id]) {
        acc[role_id] = { id: role_id, name: role_name, permissions: [] };
      }
      if (permission_id) {
        acc[role_id].permissions.push({
          id: permission_id,
          name: permission_name,
        });
      }
      return acc;
    }, {});

    res.json(Object.values(rolesMap));
  } catch (error) {
    console.error("Error retrieving roles with permissions:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve roles with permissions" });
  }
});

module.exports = router;
