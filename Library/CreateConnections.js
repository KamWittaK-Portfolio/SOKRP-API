const mysql = require('mysql2');
const { TeamSpeak } = require('ts3-nodejs-library'); // Import TeamSpeak correctly
const { TSConfig, dbConfig } = require('../config');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');


class CreateConnections {
    static ConnectToDB() {
        const connection = mysql.createConnection(dbConfig);

        connection.connect((err) => {
            if (err) {
                console.error('Database error:', err);
            } else {
                console.log('Successfully connected to the Database');
            }
        });

        return connection;
    }

    static async ConnectToTS() {
        try {
            const teamspeak = await TeamSpeak.connect({
                host: TSConfig.TS_SERVER_ADDRESS,
                queryport: TSConfig.TS_QUERY_PORT,
                username: TSConfig.TS_QUERY_USERNAME,
                password: TSConfig.TS_QUERY_PASSWORD,
                nickname: "NodeJS Query Framework"
            });

            await teamspeak.useBySid(TSConfig.VIRTUAL_SERVER_ID);
            console.log('Successfully connected to the TeamSpeak');

            return teamspeak;
        } catch (err) {
            console.error('Error occurred:', err);
            throw err; // Re-throw the error to be handled by the caller
        }
    }

    static async ConnectToInterviewTS() {

    }

    static async ConnectToSheets(){
        const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
        const SERVICE_ACCOUNT_FILE = 'creds.json'; // Path to your service account key file
    
        // Load the credentials from the JSON key file
        const auth = new GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: SCOPES
        });
    
        // Build the Sheets API service
        const authClient = await auth.getClient();
        const service = google.sheets({ version: 'v4', auth: authClient });
        console.log('Successfully connected to the HA Sheet');

        return service;        
    }

}

module.exports = CreateConnections;