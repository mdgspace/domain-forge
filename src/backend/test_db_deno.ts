import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const MONGO_URI = Deno.env.get("MONGO_URI");

console.log("----------------------------------------");
console.log("DEBUGGING MONGODB CONNECTION");
console.log("----------------------------------------");

if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is NOT set in the environment.");
    console.log("Please check your .env file.");
} else {
    // Mask password for logging
    const maskedUri = MONGO_URI.replace(/:([^@]+)@/, ":****@");
    console.log(`✅ MONGO_URI found: ${maskedUri}`);
}

const client = new MongoClient();

async function testConnection() {
    if (!MONGO_URI) return;

    try {
        console.log("Attempting to connect with Deno driver...");
        await client.connect(MONGO_URI);
        console.log("✅ SUCCESS: Connected to MongoDB!");

        const db = client.database("df_test");
        const collections = await db.listCollectionNames();
        console.log("✅ Collections found:", collections);

        client.close();
    } catch (error) {
        console.error("❌ FAILURE: Could not connect to MongoDB.");
        console.error("Error details:", error);

        // Check for common SRV issues
        if (MONGO_URI.includes("mongodb+srv://")) {
            console.log("\n⚠️  NOTE: You are using a 'mongodb+srv://' connection string.");
            console.log("If this fails in Deno but works in Node, it might be a DNS resolution issue with the Deno driver.");
            console.log("Try using the standard 'mongodb://' connection string if possible.");
        }
    }
}

testConnection();
