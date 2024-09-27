class RankUpdater {
    static async addRoleFromWebsiteID(data, websiteID, DBconnection) {
        try {
            // Step 1: Select the role ID from the roles table using the role name
            const query1 = 'SELECT id FROM `roles` WHERE name = ?';
            const selectRoleID = await new Promise((resolve, reject) => {
                DBconnection.query(query1, [data['Role Name']], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (!selectRoleID.length) {
                return { error: "Role not found", status: 404 };
            }

            const roleID = selectRoleID[0]['id'];

            // Step 2: Check if the user already has the role
            const queryCheck = 'SELECT * FROM `user_roles` WHERE website_id = ? AND role_id = ?';
            const checkUserRole = await new Promise((resolve, reject) => {
                DBconnection.query(queryCheck, [websiteID['WebsiteID'], roleID], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (checkUserRole.length > 0) {
                return { error: "User already has this role", status: 400 };
            }

            // Step 3: Insert the role ID into the user_roles table
            const query2 = 'INSERT INTO `user_roles` (website_id, role_id) VALUES (?, ?)';
            const insertUserRoleResult = await new Promise((resolve, reject) => {
                DBconnection.query(query2, [websiteID['WebsiteID'], roleID], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (insertUserRoleResult.affectedRows === 0) {
                return { error: "Role could not be added to user_roles", status: 500 };
            }

            return { success: true, role_id: roleID, status: 200 };
        } catch (err) {
            console.error('Error adding role:', err);
            return { status: 500, error: 'Internal Server Error' };
        }
    }

    static async removeRoleFromWebsiteID(data, websiteID, DBconnection) {
        try {
            // Step 1: Get a list of role_ids associated with the website_id
            const query1 = 'SELECT role_id FROM `user_roles` WHERE website_id = ?';
            const roleIdsResult = await new Promise((resolve, reject) => {
                DBconnection.query(query1, [websiteID['WebsiteID']], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (!roleIdsResult.length) {
                return { error: "No roles found for the given website ID", status: 404 };
            }

            const roleIds = roleIdsResult.map(row => row.role_id);

            // Step 2: Find the role in the roles table with the specified name and one of the role_ids from the list
            const query2 = 'SELECT id FROM `roles` WHERE name = ? AND id IN (?)';
            const roleIdResult = await new Promise((resolve, reject) => {
                DBconnection.query(query2, [data['Role Name'], roleIds], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (!roleIdResult.length) {
                return { error: "Role not found with the given name and website ID", status: 404 };
            }

            const roleId = roleIdResult[0].id;

            // Step 3: Check if the user actually has the role
            const queryCheck = 'SELECT * FROM `user_roles` WHERE website_id = ? AND role_id = ?';
            const checkUserRole = await new Promise((resolve, reject) => {
                DBconnection.query(queryCheck, [websiteID['WebsiteID'], roleId], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (checkUserRole.length === 0) {
                return { error: "User does not have this role", status: 400 };
            }

            // Step 4: Delete the role from the user_roles table
            const query3 = 'DELETE FROM `user_roles` WHERE website_id = ? AND role_id = ?';
            const deleteUserRoleResult = await new Promise((resolve, reject) => {
                DBconnection.query(query3, [websiteID['WebsiteID'], roleId], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (deleteUserRoleResult.affectedRows === 0) {
                return { error: "Role could not be deleted from user_roles table", status: 500 };
            }

            return { success: true, status: 200 };
        } catch (err) {
            console.error('Error removing role:', err);
            return { status: 500, error: 'Internal Server Error' };
        }
    }
}

module.exports = RankUpdater;