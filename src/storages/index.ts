import { Storage } from "@plasmohq/storage";

const storage = new Storage({ area: "local" });
const sessionStorage = new Storage({ area: "session" });
const syncStorage = new Storage({ area: "sync" });

export { storage, sessionStorage, syncStorage };
