const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PORT;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID
const RANGE_NAME = process.env.RANGE_NAME

// MySQL database connection configuration
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE
};

const TSConfig = {
    TS_SERVER_ADDRESS: process.env.TS_SERVER_ADDRESS,
    TS_QUERY_PORT: process.env.TS_QUERY_PORT,
    TS_QUERY_USERNAME: process.env.TS_QUERY_USERNAME,
    TS_QUERY_PASSWORD: process.env.TS_QUERY_PASSWORD,
    VIRTUAL_SERVER_ID: process.env.VIRTUAL_SERVER_ID
};

module.exports = { dbConfig, TSConfig, PORT, SPREADSHEET_ID, RANGE_NAME };
