import { ServiceBroker } from "moleculer";
import moleculerConfig from "./moleculer.config.js";
import mongoose from "mongoose";
import { env } from "./env.js";
import { readdir } from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
await mongoose.connect(env.MONGODB_URI);
const broker = new ServiceBroker(moleculerConfig);
const services = !env.SERVICES ? await readdir(path.join(import.meta.dirname, "./services")) : env.SERVICES.split(",");
for (const service of services) {
    const servicePath = path.join(import.meta.dirname, `./services/${service}/index.js`);
    const serviceURL = pathToFileURL(servicePath).href;
    await broker.createService((await import(serviceURL)).default);
}
broker.start();
//# sourceMappingURL=index.js.map