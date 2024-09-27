const express = require('express');
const cors = require('cors');
const RankUpdater = require('./Library/RankUpdater');
const RBAC = require('./Library/RBAC');
const GetUserInfo = require('./Library/GetUserInfo');
const CreateConnections = require('./Library/CreateConnections');
const TSCommands = require('./Library/TSCommands');
const DiscordCommands = require('./Library/DiscordCommands');
const Authentication = require('./Library/Authentication/Auth');
const UpdateHASheet = require('./Library/UpdateHASheet');
const PORT = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

let DBconnection;
let TSconnection;

(async () => {
    try {
        DBconnection = await CreateConnections.ConnectToDB();
        TSconnection = await CreateConnections.ConnectToTS();
        Sheetsconnection = await CreateConnections.ConnectToSheets();
    } catch (err) {
        console.error('Failed to connect:', err);
        process.exit(1);
    }
})();

app.get('/api/RBAC', async (req, res) => {
    const data = req.body;

    // Checking for Api-Key
    const authenticated = await Authentication.auth(data);
    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }

    // Checking for Perms
    const WebsiteID = await GetUserInfo.getWebsiteIDFromDiscordID(data['Discord ID'], DBconnection);
    const RoleIDList = await GetUserInfo.getRoleIDListFromWebsiteID(WebsiteID, DBconnection);
    const roleIds = RoleIDList.RoleID.map(role => role.role_id);
    const rbacResult = await RBAC.getPermBoolFromRoleID(roleIds, data['role'], DBconnection);

    if (rbacResult.status !== 200) {
        return res.json({ status: rbacResult.status, error: rbacResult.error });
    }

    return res.json({ status: rbacResult.status });
});

app.post('/api/discord/add/role', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }
    const websiteID = await GetUserInfo.getWebsiteIDFromDiscordID(data['Discord ID'], DBconnection);

    const RankUpdaterStatus = await RankUpdater.addRoleFromWebsiteID(data, websiteID, DBconnection);

    return res.json({ stats: RankUpdaterStatus.status })
});

app.post('/api/discord/remove/role', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }
    const websiteID = await GetUserInfo.getWebsiteIDFromDiscordID(data['Discord ID'], DBconnection);

    const RankUpdaterStatus = await RankUpdater.removeRoleFromWebsiteID(data, websiteID, DBconnection);

    return res.json({ stats: RankUpdaterStatus.status })
});
 
app.post('/api/discord/ban', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }


    // Getting Banner (User who is using the command) Website ID from their Discord ID
    const banningResult = await GetUserInfo.getWebsiteIDFromDiscordID(data['Discord ID'], DBconnection);
    if (banningResult.status !== 200) {
        return res.status(banningResult.status).json({ error: banningResult.error });
    }

    // Getting Bannie (User who is getting banned) Website ID from their Discord ID
    const targetResult = await GetUserInfo.getWebsiteIDFromDiscordID(data['targetDiscordID'], DBconnection);
    if (targetResult.status !== 200) {
        return res.status(targetResult.status).json({ error: targetResult.error });
    }

    // Checking if they have a superior rank to Bannie
    const targetWebsiteId = targetResult.WebsiteID;
    const banningWebsiteId = banningResult.WebsiteID;
    const banCheckResult = await RBAC.canBanUser(banningWebsiteId, targetWebsiteId, DBconnection);
    if (banCheckResult.status !== 200) {
        return res.json({ status: banCheckResult.status, error: banCheckResult.error });
    }


    const TSBanStatus = await TSCommands.banClient(data, DBconnection)
    if (TSBanStatus.status !== 200) {
        return res.json({ error: "Banning member did not work in TeamSpeak", status: 500 })
    }


    const BanStatus = await DiscordCommands.banMember(data, DBconnection)
    if (BanStatus.status !== 200) {
        return res.json({ error: "Banning member did not work in Discord", status: 500 })
    }

    return res.json({ status: 200 })
});

app.post('/api/discord/unban', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }
    const UnbanStatus = await DiscordCommands.unbanMember(data, DBconnection);

    if (UnbanStatus.status !== 200) {
        return res.json({ message: "Error Unbanning member", error: UnbanStatus.error, status: 500})
    }

    return res.json({ status: 200 })
});

app.get('/api/discord/cases_for', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }

    try {
        const response = await DiscordCommands.getUserInfo(data, DBconnection);
        if (response.status !== 200) {
            return res.status(500).json({ status: 500, message: "Error getting User Info", error: response.error });
        }

        return res.json({
            status: response.status,
            Ids: response.Ids,
            WebsiteIds: response.WebsiteIds,
            ResignationTypes: response.ResignationTypes,
            ResignationDates: response.ResignationDates,
            ResignationCounts: response.ResignationCounts,
            ProcessedBy: response.ProcessedBy,
            UsersPrimaryDepartments: response.UsersPrimaryDepartments,
            MembershipDurations: response.MembershipDurations,
            Notes: response.Notes,
            MembershipHistoryIds: response.MembershipHistoryIds,
            IACaseFiles: response.IACaseFiles,
            CommunityDisciplineRecords: response.CommunityDisciplineRecords
        });

    } catch (error) {
        console.error('Error getting User Info:', error);
        return res.status(500).json({ status: 500, message: 'Internal Server Error', error });
    }
});

app.get('/api/discord/verify', async (req, res) => {
    data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }
    const websiteID = await GetUserInfo.getWebsiteIDFromDiscordID(data['Discord ID'], DBconnection)
    const roleList = await GetUserInfo.getRoleIDListFromWebsiteID(websiteID, DBconnection)
    const roleNames = await GetUserInfo.getRoleNamesFromRoleIDs(roleList, DBconnection)
 

    return res.json({ status: roleNames.status, RoleList: roleNames.RoleNames })
});

app.get('/api/discord/get/member/count', async (req, res) => {
    data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }
    memberCount = await DiscordCommands.getMemberCount(DBconnection);

    return res.json({ status: memberCount.status, MemberCount: memberCount })
});

app.get('/api/discord/websiteID/to/discordID', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.json({ status: 403 });
    } else if (authenticated === 400) {
        return res.json({ error: "Missing Api Key", status: 400 });
    }

    const discordID = await GetUserInfo.getDiscordIDFromWebsiteID(data['websiteID'], DBconnection)
    if (discordID.status != 200) {
        return res.json({ status: discordID.status, discordID: discordID.discord_id });
    }

    return res.json({ status: discordID.status, discordID: discordID.DiscordID })

});

app.post('/api/discord/update/HA/roster', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.status(403).json({ status: 403 });
    } else if (authenticated === 400) {
        return res.status(400).json({ error: "Missing Api Key", status: 400 });
    }

    const getData = await UpdateHASheet.getData(DBconnection)
    if(getData.status != 200){
        return res.json({ error: getData.error, status: getData.status });
    }
    
    const updateSheet = await UpdateHASheet.exportToSheet(getData.data, Sheetsconnection)
    if(updateSheet.status != 200){
        return res.json({ error: updateSheet.error, status: updateSheet.status });
    }

    return res.json({ status: 200 })

});

app.post('/api/discord/get/nick', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.status(403).json({ status: 403 });
    } else if (authenticated === 400) {
        return res.status(400).json({ error: "Missing Api Key", status: 400 });
    }

    const nick = await GetUserInfo.getUserNickFromDiscordID(data['Discord ID'], DBconnection);
    if (nick.status != 200) {
        return res.json({ status: nick.status, error: nick.error });
    }

    return res.json({ status: nick.status, nick: nick.nick })

});

app.get('/api/discord/member/leave', async (req, res) => {
    const data = req.body;
    const authenticated = await Authentication.auth(data);

    if (!authenticated) {
        return res.status(403).json({ status: 403 });
    } else if (authenticated === 400) {
        return res.status(400).json({ error: "Missing Api Key", status: 400 });
    }

    const webID = await GetUserInfo.getWebsiteIDFromDiscordID(data['Discord ID'], DBconnection);
    if (webID.status != 200) {
        return res.json({ status: webID.status, error: webID.error })
    }

    return res.json({ status: 200, WebsiteID: webID })
});

function updateSheet() {
    const url = `http://127.0.0.1:${PORT.PORT}/api/discord/update/HA/roster`;
    const payload = {
        "Api-Key": "THIS IS THE API KEY"
    };

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            console.log(response.json())
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

function getMillisecondsUntilNextTrigger(hour) {
    const now = new Date();
    const nextTrigger = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);

    if (now.getHours() >= hour) {
        nextTrigger.setDate(nextTrigger.getDate() + 1);
    }

    return nextTrigger - now;
}

function scheduleUpdates() {
    function scheduleNextUpdate() {
        const intervalMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const delayUntilNext12AM = getMillisecondsUntilNextTrigger(0);
        const delayUntilNext12PM = getMillisecondsUntilNextTrigger(12);

        // Schedule update at 12 AM
        setTimeout(() => {
            updateSheet();
            setInterval(updateSheet, intervalMs);
        }, delayUntilNext12AM);

        // Schedule update at 12 PM
        setTimeout(() => {
            updateSheet();
            setInterval(updateSheet, intervalMs);
        }, delayUntilNext12PM);
    }

    scheduleNextUpdate();
}

app.listen(PORT.PORT, async () => {
    console.log(`Server is running on port ${PORT.PORT}`);

    // Schedule the updates
    scheduleUpdates();
});

// Ethan is gay
// Ethan is gay