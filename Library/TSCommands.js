const CreateConnections = require("./CreateConnections");
const GetUserInfo = require("./GetUserInfo")
const TSCommands = require("./TSCommands")

class GetTSInfo {
    static async connectToTS() {
        try {
            return await CreateConnections.ConnectToTS();
        } catch (err) {
            console.error('Failed to connect to TeamSpeak:', err);
            throw err;
        }
    }

    static async getClientDbid(uid) {
        try {
            const tsConnection = await this.connectToTS();
            const dbid = await tsConnection.clientGetDbidFromUid(uid);
            await tsConnection.quit();
            return dbid.cldbid;
        } catch (err) {
            console.error('Failed to get client database ID:', err);
            throw err;
        }
    }

    static async serverGroupsByClientId(dbid) {
        try {
            const tsConnection = await this.connectToTS();
            const groups = await tsConnection.serverGroupsByClientId(dbid);
            await tsConnection.quit();
            return groups;
        } catch (err) {
            console.error('Failed to get server groups by client ID:', err);
            throw err;
        }
    }

    static async serverGroupAddClients(client, sgids) {
        try {
            const tsConnection = await this.connectToTS();

            for (const sgid of sgids) {
                await tsConnection.serverGroupAddClient(client, sgid);
            }

            await tsConnection.quit();
        } catch (err) {
            console.error(`Failed to add client to server group (client: ${client}, groups: ${sgids}):`, err);
            throw err;
        }
    }

    static async removeAllServerGroups(cdbid, sgids) {
        try {
            const tsConnection = await this.connectToTS();
            for (const sgid of sgids) {
                await tsConnection.serverGroupDelClient(cdbid, sgid);
            }
            await tsConnection.quit();
        } catch (err) {
            console.error('Error removing all server groups:', err);
            throw err;
        }
    }

    static async serverGroupAddClients(client, sgids) {
        try {
            const tsConnection = await this.connectToTS();
            for (const sgid of sgids) {
                await tsConnection.serverGroupAddClient(client, sgid);
            }
            await tsConnection.quit();
        } catch (err) {
            console.error(`Error adding client to server group (client: ${client}, groups: ${sgids}):`, err);
            throw err;
        }
    }

    static async getSGIDfromNames(names) {
        try {
            const tsConnection = await this.connectToTS();
            let result = [];

            for (const name of names) {
                try {
                    const group = await tsConnection.getServerGroupByName(name);
                    result.push(group.sgid);
                } catch (err) {
                    return json({ error: "Server Group doen't exist"})
                }

            }

            await tsConnection.quit();
            return { SGIDS: result, Status: 200 };
        } catch (err) {
            console.error('Error returning SGIDS from names', err);
            return { Status: 500 };
        }
    }

    static async banClient(data, DBconnection) {
        try {
            const tsConnection = await this.connectToTS();
            const UID = await GetUserInfo.getTeamSpeakUIDFromDiscordID(data['targetDiscordID'], DBconnection);

            const ban = await tsConnection.ban({
                uid: UID,
                banreason: data["Reason"]
            });


            return { status: 200 };
        } catch (error) {
            console.error("Error banning client:", error);
            return { status: 500, reason: error };
        }
    }

}


module.exports = GetTSInfo;