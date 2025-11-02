import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config()

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL,{})
        console.log(`Moongodb connected successfully: ${conn.connection.host}`);
    } catch (error) {
        console.log(`mongoDBconnection Failed: ${error.message}`)
        process.exit(1)
    }
}

export default connectDB;