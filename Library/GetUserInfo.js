class GetUserInfo {
    static async getWebsiteIDFromDiscordID(discordID, DBconnection) {
        if (!discordID) {
            return { error: 'Discord ID is required', status: 400 };
        }

        const query = 'SELECT website_id FROM `users` WHERE discord_id = ?';
        return new Promise((resolve, reject) => {
            DBconnection.query(query, [discordID], (err, results) => {
                if (err) {
                    return reject({ error: err, status: 500 });
                }
                if (results.length === 0) {
                    return resolve({ error: 'Website ID not found', status: 404 });
                }
                resolve({ WebsiteID: results[0].website_id, status: 200 });
            });
        });
    }

    static async getDiscordIDFromWebsiteID(websiteID, DBconnection) {
        const query = 'SELECT discord_id FROM `users` WHERE website_id = ?';
        return new Promise((resolve, reject) => {
            DBconnection.query(query, [websiteID], (err, results) => {
                if (err) {
                    return reject({ error: err, status: 500 });
                }
                if (results.length === 0) {
                    return resolve({ error: 'Discord ID not found', status: 404 });
                }
                resolve({ DiscordID: results[0].discord_id, status: 200 });
            });
        });
    }

    static async getRoleIDListFromWebsiteID(websiteID, DBconnection) {
        const query = 'SELECT role_id FROM `user_roles` WHERE website_id = ?';
        return new Promise((resolve, reject) => {
            DBconnection.query(query, [websiteID['WebsiteID']], (err, results) => {
                if (err) {
                    return reject({ error: err, status: 500 });
                }
                if (results.length === 0) {
                    return resolve({ error: 'Role ID not found for the given Website ID', status: 404 });
                }
                resolve({ RoleID: results, status: 200 });
            });
        });
    }

    static async getRoleNamesFromRoleIDs(roleIDs, DBconnection) {
        const query = 'SELECT name FROM `roles` WHERE id = ?';

        try {
            // Extract the actual role IDs from the input
            const ids = roleIDs.RoleID.map(role => role.role_id);

            const roleNamesPromises = ids.map(id => {
                return new Promise((resolve, reject) => {
                    DBconnection.query(query, [id], (err, result) => {
                        if (err) {
                            return reject({ error: err.message, status: 500 });
                        }
                        if (result.length === 0) {
                            return resolve(null);
                        }
                        resolve(result[0].name);
                    });
                });
            });

            const roleNames = await Promise.all(roleNamesPromises);
            const validRoleNames = roleNames.filter(name => name !== null);

            if (validRoleNames.length === 0) {
                return { error: 'No role names were found', status: 404 };
            }

            return { RoleNames: validRoleNames, status: 200 };
        } catch (error) {
            console.error('Error occurred:', error);
            return { error: error.error || 'An unexpected error occurred', status: error.status || 500 };
        }
    }

    static async getTeamSpeakUIDFromDiscordID(discordID, DBconnection) {
        const query = 'SELECT teamspeak_uid FROM `users` WHERE discord_id = ?';

        try {
            return new Promise((resolve, reject) => {
                DBconnection.query(query, [discordID], (err, result) => {
                    if (err) {
                        console.error('Database query error:', err);
                        return reject({ error: 'Database query error', status: 500 });
                    }
                    if (result.length === 0) {
                        return resolve(null);
                    }
                    resolve(result[0]['teamspeak_uid']);
                });
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            return { error: 'An unexpected error occurred', status: 500 };
        }
    }

    static async getUserNickFromDiscordID(discordID, DBconnection) {
        const query = "SELECT CONCAT(name, ' ', call_sign) AS nick FROM users WHERE discord_id = ?;";

        try {
            return new Promise((resolve, reject) => {
                DBconnection.query(query, [discordID], (err, result) => {
                    if (err) {
                        console.error('Database query error:', err);
                        return reject({ error: 'Database query error', status: 500 });
                    }
                    if (result.length === 0) {
                        return resolve(null); // No result found
                    }
                    resolve({ nick: result[0]['nick'], status: 200 }); // Resolve with the nickname
                });
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            return { error: 'An unexpected error occurred', status: 500 };
        }
    }

}

module.exports = GetUserInfo;