const GetUserInfo = require('./GetUserInfo')

class DiscordCommands {
    static async banMember(data, DBconnection) {
        try {
            // Start the transaction
            await new Promise((resolve, reject) => {
                DBconnection.beginTransaction(err => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve();
                });
            });

            // Step 0: Retrieve website_id
            const websiteIdResult = await new Promise((resolve, reject) => {
                const query = 'SELECT website_id FROM users WHERE discord_id = ?';
                DBconnection.query(query, [data['targetDiscordID']], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    if (results.length === 0) {
                        return reject({ error: 'User not found', status: 404 });
                    }
                    resolve(results[0].website_id);
                });
            });

            const websiteId = websiteIdResult;

            // Step 0.1: Retrieve website_id
            const bannedByUserID = await new Promise((resolve, reject) => {
                const query = 'SELECT website_id FROM users WHERE discord_id = ?';
                DBconnection.query(query, [data['banned_by']], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    if (results.length === 0) {
                        return reject({ error: 'User not found', status: 404 });
                    }
                    resolve(results[0].website_id);
                });
            });

            const bannedBywebsiteId = bannedByUserID;

            // Step 1: Update membership_history to set the leave_date
            await new Promise((resolve, reject) => {
                const query = `
                    UPDATE membership_history
                    SET leave_date = NOW()
                    WHERE website_id = ?
                    AND leave_date IS NULL
                `;
                DBconnection.query(query, [websiteId], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            // Calculate the resignation_count
            const resignationCount = await new Promise((resolve, reject) => {
                const query = `
                    SELECT COUNT(*) + 1 AS count 
                    FROM resignation_status 
                    WHERE website_id = ?
                `;

                DBconnection.query(query, [websiteId], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results[0].count);
                });
            });

            // Step 2: Insert into resignation_status using the pre-calculated resignation_count
            await new Promise((resolve, reject) => {
                const query = `
                    INSERT INTO resignation_status (
                        website_id, resignation_type, resignation_date, resignation_count, 
                        processed_by, users_primary_department, membership_duration, notes, 
                        membership_history_id
                    ) 
                    VALUES (
                        ?, ?, NOW(), ?, 
                        ?, 
                        (SELECT d.dept_name
                            FROM user_roles ur
                            JOIN roles r ON r.id = ur.role_id
                            JOIN roles r2 ON r2.role_type = r.role_type
                            JOIN \`config.departments\` d ON d.dept_id = r.role_type
                            WHERE ur.website_id = ?
                            AND r.role_type LIKE 'dept%'
                            AND r.role_type IN (
                                SELECT dept_id FROM \`config.departments\`
                            )
                            LIMIT 1
                        ), 
                        TIMESTAMPDIFF(DAY, (SELECT join_date FROM membership_history WHERE website_id = ? ORDER BY join_date DESC LIMIT 1), NOW()), 
                        ?, 
                        (SELECT id FROM membership_history WHERE website_id = ? ORDER BY join_date DESC LIMIT 1)
                    )
                `;
                DBconnection.query(query, [websiteId, data['resignation'], resignationCount, bannedBywebsiteId, websiteId, websiteId, data['Reason'], websiteId],
                    (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (data['resignation'] !== "Proper") {
                // Step 3: Insert into user_ban_records
                await new Promise((resolve, reject) => {
                    const query = `
                        INSERT INTO user_ban_records (
                            website_id, case_number, ban_type, ban_length, eligible_for_appeal, 
                            reason, appeal_status, appeal_outcome, timestamp, processed_by
                        ) 
                        VALUES (?, ?, ?, NULL, 0, ?, 'None', NULL, NOW(), ?)
                    `;
                    DBconnection.query(query, [websiteId, data['case_number'], data['ban_type'], data['Reason'], bannedBywebsiteId],
                        (err, results) => {
                            if (err) {
                                return reject({ error: err, status: 500 });
                            }
                            resolve(results);
                        });
                });
            }

            // Step 4: Delete existing roles and insert into user_roles to reflect the ban
            await new Promise((resolve, reject) => {
                // Start by deleting any existing roles for the user
                const deleteQuery = `
                    DELETE FROM user_roles 
                    WHERE website_id = ?
                `;
                DBconnection.query(deleteQuery, [websiteId], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }

                    // After deleting, insert the new banned role
                    const insertQuery = `
                        INSERT INTO user_roles (website_id, role_id) 
                        VALUES (?, 133) -- The role_id for a banned user
                    `;
                    DBconnection.query(insertQuery, [websiteId], (err, results) => {
                        if (err) {
                            return reject({ error: err, status: 500 });
                        }
                        resolve(results);
                    });
                });
            });

            // Removes from fto.members
            await new Promise((resolve, reject) => {
                // Start by deleting any existing roles for the user
                const deleteQuery = `
                    DELETE FROM \`fto.members\` 
                    WHERE website_id = ?
                `;
                DBconnection.query(deleteQuery, [websiteId], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }

                    resolve(results);
                });
            });

            // If all queries are successful, commit the transaction
            await new Promise((resolve, reject) => {
                DBconnection.commit(err => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve();
                });
            });

            return { status: 200, message: 'Member banned successfully' };

        } catch (error) {
            // If any query fails, roll back the transaction
            await new Promise((resolve, reject) => {
                DBconnection.rollback(() => {
                    // Rollback doesn't throw an error, so we only resolve
                    resolve();
                });
            });

            console.error('Error banning member:', error);
            return { status: 500, message: 'Internal Server Error', error: "An error happened during the SQL transaction. Contact Will or Ethan. ERROR CODE: WE'RE COOKED - I QUIT" };
        }
    }

    static async unbanMember(data, DBconnection) {
        try {
            const queryCheck = 'UPDATE bans SET unbanned_date = ?, unbanned_by = ? WHERE unbanned_date IS NULL AND discord_id = ?';
            const updateResult = await new Promise((resolve, reject) => {
                DBconnection.query(queryCheck, [data['unbanned_date'], data['unbanned_by'], data['discord_id']], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            if (updateResult.affectedRows === 0) {
                return { status: 404, message: 'No ban record found with the given discord_id and unbanned_date is NULL' };
            }

            return { status: 200, message: 'Member unbanned successfully', updateResult };

        } catch (error) {
            console.error('Error unbanning member:', error);
            return { status: 500, message: 'Internal Server Error', error };
        }
    }

    static async getUserInfo(data, DBconnection) {
        try {
            const websiteId = await GetUserInfo.getWebsiteIDFromDiscordID(data['discord_id'], DBconnection)
            const query = 'SELECT * FROM resignation_status WHERE website_id = ?';
            const banInfo = await new Promise((resolve, reject) => {
                DBconnection.query(query, [websiteId['WebsiteID']], (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });

            const id = [];
            const website_id = [];
            const resignation_type = [];
            const resignation_date = [];
            const resignation_count = [];
            const processed_by = [];
            const users_primary_department = [];
            const membership_duration = [];
            const notes = [];
            const membership_history_id = [];
            const ia_case_file = [];
            const community_discipline_record = [];

            for (const record of banInfo) {
                id.push(record['id']);
                website_id.push(record['website_id']);
                resignation_type.push(record['resignation_type']);
                resignation_date.push(record['resignation_date']);
                resignation_count.push(record['resignation_count']);
                processed_by.push(record['processed_by']);
                users_primary_department.push(record['users_primary_department']);
                membership_duration.push(record['membership_duration']);
                notes.push(record['notes']);
                membership_history_id.push(record['membership_history_id']);
                ia_case_file.push(record['ia_case_file']);
                community_discipline_record.push(record['community_discipline_record']);
            }

            return {
                status: 200,
                Ids: id,
                WebsiteIds: website_id,
                ResignationTypes: resignation_type,
                ResignationDates: resignation_date,
                ResignationCounts: resignation_count,
                ProcessedBy: processed_by,
                UsersPrimaryDepartments: users_primary_department,
                MembershipDurations: membership_duration,
                Notes: notes,
                MembershipHistoryIds: membership_history_id,
                IACaseFiles: ia_case_file,
                CommunityDisciplineRecords: community_discipline_record
            };
        } catch (error) {
            console.error(error)
            return { status: 500, error };
        }
    }

    static async getMemberCount(DBconnection) {
        const query = 'SELECT website_id FROM `users` WHERE community_rank = "Member"';
        try {
            const results = await new Promise((resolve, reject) => {
                DBconnection.query(query, (err, results) => {
                    if (err) {
                        return reject({ error: err, status: 500 });
                    }
                    resolve(results);
                });
            });
            return { status: 200, MemberCount: results.length };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = DiscordCommands;