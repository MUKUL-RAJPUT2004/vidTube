import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

 const connectDB = async () =>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`\n MongoDB connected! DB host: ${connectionInstance.connection.host}`);
        
        // Log more connection details
        console.log(`MongoDB Connection Details:
        - Database name: ${connectionInstance.connection.name}
        - Connection state: ${connectionInstance.connection.readyState} (0: disconnected, 1: connected, 2: connecting, 3: disconnecting)
        - Port: ${connectionInstance.connection.port || 'default'}
        - Models registered: ${Object.keys(connectionInstance.models).join(', ') || 'none'}
        - Server options: ${JSON.stringify(connectionInstance.connection.client.options.serverApi || {}, null, 2)}
        - MongoDB version: ${connectionInstance.connection.db?.serverConfig?.ismaster?.version || 'unknown'}
        `);
    } catch (error) {
        console.log("MongoDB Connection error", error);
        process.exit(1);
    }
 }


 export default connectDB;