class RBAC {
    static async getPermBoolFromRoleID(roleID, permissionName, connection) {
        if (!roleID || !permissionName) {
            return { error: 'Role ID and permission name are required', status: 400 };
        }

        // Ensure roleID is an array
        if (!Array.isArray(roleID)) {
            roleID = [roleID];
        }

        const results = [];
        let isAuthorized = false;

        for (let i = 0; i < roleID.length; i++) {
            const id = roleID[i];
            const query = 'SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?';

            try {
                const result = await new Promise((resolve, reject) => {
                    connection.query(query, [id], (err, rows) => {
                        if (err) {
                            reject({ error: err, status: 500 });
                        } else {
                            resolve({ permission: rows });
                        }
                    });
                });

                if (result.permission && result.permission.length > 0) {
                    results.push(result);
                }

            } catch (error) {
                console.error('Error querying the database:', error);
                return { error: error.error, status: error.status };
            }
        }

        if (results.length === 0) {
            return { status: 404, results: "Not Authorized" };
        }


        results.some(result => {
            return result.permission.some(permission => {
                if (permission['name'] === permissionName) {
                    isAuthorized = true;
                    return true;  // Breaks out of the inner loop
                }
                return false;
            });
        });

        if (!isAuthorized) {
            return { status: 404, results: "Not Authorized" };
        }


        return { status: 200 };

    }

    static async canBanUser(banningUserID, targetUserID, connection) {
        if (!banningUserID || !targetUserID) {
            return { error: 'Banning user ID and target user ID are required', status: 400 };
        }

        try {
            const banningQuery = `
                SELECT r.sort_id
                FROM users u
                JOIN user_roles ur ON u.website_id = ur.website_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.website_id = ? AND r.role_type = 'community'
                LIMIT 1;
            `;

            const targetQuery = `
                SELECT r.sort_id
                FROM users u
                JOIN user_roles ur ON u.website_id = ur.website_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.website_id = ? AND r.role_type = 'community'
                LIMIT 1;
            `;

            const [banningSortID, targetSortID] = await Promise.all([
                new Promise((resolve, reject) => {
                    connection.query(banningQuery, [banningUserID], (err, rows) => {
                        if (err) {
                            reject({ error: err, status: 500 });
                        } else {
                            resolve(rows.length > 0 ? rows[0].sort_id : null);
                        }
                    });
                }),
                new Promise((resolve, reject) => {
                    connection.query(targetQuery, [targetUserID], (err, rows) => {
                        if (err) {
                            reject({ error: err, status: 500 });
                        } else {
                            resolve(rows.length > 0 ? rows[0].sort_id : null);
                        }
                    });
                })
            ]);

            if (banningSortID === null || targetSortID === null) {
                return { status: 404, error: 'User role not found' };
            }

            if (banningSortID >= targetSortID) {
                return { status: 403, error: 'You cannot ban a user with the same or higher rank than yourself' };
            }

            return { status: 200, message: 'You can ban this user' };
        } catch (error) {
            console.error('Error querying the database:', error);
            return { error: error.error, status: error.status };
        }
    }
}

module.exports = RBAC;