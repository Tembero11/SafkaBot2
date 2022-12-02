import { WeekMenu } from "./types";
import MenuPoller from "./webScrape/MenuPoller";
import dotenv from "dotenv";
import { getCurrentDayIndex } from "./utils";
import { Archiver, Database } from "./database/db";
import { hashMenus } from "./database/dbUtils";
import assert from "assert";
import { startServer } from "./api/startServer";

// Env
dotenv.config();

const DISABLE_POLL = process.env.DISABLE_POLL == "true";
const DISABLE_DB = process.env.DISABLE_DB == "true";
const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "SafkaArchiverDB";
export const PORT = process.env.PORT || 5000;

if (DISABLE_POLL) {
    console.log("Menu polling is disabled. This can be changed in the root directory's .env file by setting the 'DISABLE_POLL=false'.")
}
if (DISABLE_DB) {
    console.log("Database is disabled. This can be changed in the root directory's .env file by setting the 'DISABLE_DB=false'.")
}

export let currentMenu: WeekMenu;

// Async setup code
(async function () {
    const db = new Database({ dbUrl: DB_URL, dbName: DB_NAME });

    assert(db, new Error("Database undefined"));

    let archiver: Archiver | undefined;
    if (!DISABLE_DB) {
        archiver = await db.connect();
        assert(archiver, "Archiver is undefined");
    }

    const poller = new MenuPoller({ enableLogs: true });

    poller.on("polled", (menu) => {
        currentMenu = menu;

        // Check that the database is not disabled
        if (!DISABLE_DB && archiver) {
            // foodArchive menus                                                   
            archiver.weekMenu = currentMenu;
            archiver.dayMenu = currentMenu.days[getCurrentDayIndex()];
            // Add current menu to MongoDb                                         
            archiver.saveMenus();
        }
    });

    if (!DISABLE_POLL) poller.startPolling();

    // Start the http api server
    startServer(Number(PORT));
})()