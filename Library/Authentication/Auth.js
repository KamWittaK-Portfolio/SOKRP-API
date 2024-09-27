// require('dotenv').config({ path: path.resolve(__dirname, '.env') });


class Authentication{
    static async auth(data) {
        if (!data["Api-Key"]) {
            return 400
        }

        if (data["Api-Key"] === "THIS IS THE API KEY") {
            return true
        } else {
            return false
        }
    }
};

module.exports = Authentication;