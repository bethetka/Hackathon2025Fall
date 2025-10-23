import "dotenv/config";
import { cleanEnv, port, str } from "envalid";

export const env = cleanEnv(process.env, {
    MONGODB_URI: str(),
    PORT: port({default: 3000}),
    SERVICES: str({default: ""}),
    JWT_SECRET: str(),
    JWT_MAGIC: str(),

});