const config = require('../config')

class UpdateHASheet{
    static async getData(DBconnection){
        try {
            const query = `
                SELECT 
                    u.email, 
                    u.name,
                    (
                        SELECT d.dept_name
                        FROM user_roles ur
                        JOIN roles r ON r.id = ur.role_id
                        JOIN roles r2 ON r2.role_type = r.role_type
                        JOIN \`config.departments\` d ON d.dept_id = r.role_type
                        WHERE ur.website_id = u.website_id
                        AND r.role_type LIKE 'dept%'
                        AND r.role_type IN (
                            SELECT dept_id FROM \`config.departments\`
                        )
                        LIMIT 1
                    ) AS primary_department_choice,
                    u.call_sign,
                    u.website_id,
                    NOW() AS formSubmittedOn,
                    u.teamspeak_uid,
                    u.discord_id,
                    NOW() AS Date
                FROM users u
                WHERE u.community_ban = 0
                AND EXISTS (
                    SELECT 1 
                    FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.website_id = u.website_id 
                      AND r.role_type = 'community' 
                      AND r.id < 13
                );
            `;
    
            // Await the result of the query
            const result = await new Promise((resolve, reject) => {
                DBconnection.query(query, [], (err, result) => {
                    if (err) {
                        console.error('Database query error:', err);
                        return reject({ error: 'Database query error', status: 500 });
                    }
                    resolve(result);
                });
            });
    
            // Return the query result
            return { data: result, status: 200 };
    
        } catch (error) {
            console.error('Unexpected error:', error);
            return { error: 'An unexpected error occurred', status: 500 };
        }
    }

    static async exportToSheet(data, Sheetsconnection) {
        const SPREADSHEET_ID = config.SPREADSHEET_ID; // Your actual spreadsheet ID
        const RANGE_NAME = config.RANGE_NAME; // Range where you want to start updating the data
    
        // Extract headers from the first object of the data array
        const headers = ['Email', 'Name', 'Primary Department Choice', 'Call Sign', 'Website ID', 'Form Submitted On', 'Teamspeak UID', 'Discord ID', 'Date'];
    
        // Create the data rows based on the JSON data array
        const rows = data.map(item => [
            item.email || '',
            item.name || '',
            item.primary_department_choice || '',
            item.call_sign || '',
            item.website_id || '',
            item.formSubmittedOn || '',
            item.teamspeak_uid || '',
            item.discord_id || '',
            item.Date || ''
        ]);
    
        // Combine the headers and rows into one 2D array
        const values = [headers, ...rows];
    
        const resource = {
            values: values
        };
    
        // Call the Sheets API to clear the existing data
        try {
            await Sheetsconnection.spreadsheets.values.clear({
                spreadsheetId: SPREADSHEET_ID,
                range: RANGE_NAME
            });
    
            // Call the Sheets API to update the sheet with new data
            const result = await Sheetsconnection.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${RANGE_NAME}!A1`, // Specify the starting cell
                valueInputOption: 'RAW',
                resource: resource
            });
    
            return { status: 200 };
        } catch (err) {
            return { status: 500, error: err}
        }
    }
}

module.exports = UpdateHASheet;