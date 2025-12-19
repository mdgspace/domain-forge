import { MongoClient } from "./dependencies.ts";
import getProviderUser from "./utils/get-user.ts";
import DfContentMap from "./types/maps_interface.ts";

// Initialize MongoClient
const client = new MongoClient();
const MONGO_URI = Deno.env.get("MONGO_URI");
if (!MONGO_URI) console.error("MONGO_URI is not set in environment variables (This will crash if DB is accessed)");

let db: any;
let userAuthCollection: any;
let contentMapsCollection: any;

try {
  if (MONGO_URI) {
    await client.connect(MONGO_URI);
    db = client.database("df_test");
    userAuthCollection = db.collection("user_auth");
    contentMapsCollection = db.collection("content_maps");
    console.log("Connected to MongoDB successfully");
  }
} catch (error) {
  console.error("Failed to connect to MongoDB", error);
}

// Function to update access token on db if user exists
async function checkUser(accessToken: string, provider: string) {
  const userId = await getProviderUser(accessToken, provider);

  // Use ADMIN_LIST to check if user is allowed
  const ADMIN_LIST = Deno.env.get("ADMIN_LIST")?.split("|") || [];
  if (!ADMIN_LIST.includes(userId)) {
    console.log(`User ${userId} is not in the allowed list.`);
    return { status: { matchedCount: 0, upsertedId: undefined }, userId };
  }

  const query = { [`${provider}Id`]: userId };
  const update = {
    $set: {
      [`${provider}Id`]: userId,
      "authToken": accessToken,
    },
  };

  const status = await userAuthCollection.updateOne(query, update, { upsert: true });
  return { status, userId };
}

// Get all content maps corresponding to user
async function getMaps(author: string, ADMIN_LIST: string[]) {
  const filter = ADMIN_LIST?.includes(author) ? {} : { "author": author };

  // Convert deprecated simple filter to standard mongo filter if needed
  // But here we use native driver which expects filter object directly.
  const data = await contentMapsCollection.find(filter).toArray();
  return { documents: data };
}

// Add content maps
async function addMaps(document: DfContentMap) {
  // Check existence
  const existing = await contentMapsCollection.findOne({ "subdomain": document.subdomain });

  if (!existing) {
    const insertId = await contentMapsCollection.insertOne(document);
    return (insertId !== undefined);
  } else {
    return false;
  }
}

// Delete content maps
async function deleteMaps(document: DfContentMap, ADMIN_LIST: string[]) {
  const filter: any = { ...document };
  // Native driver deleteOne expects a filter object
  if (ADMIN_LIST.includes(document.author)) {
    delete filter.author;
  }

  // We need to be careful with filter. Since we are passing 'document' which contains many fields
  // Using all of them as a filter might fail if any differ slightly.
  // Ideally, deleting by _id or subdomain is safest.
  // Let's rely on subdomain as the unique key generally.

  // However, preserving original logic logic:
  const deleteResult = await contentMapsCollection.deleteOne(filter);
  return deleteResult;
}

export { addMaps, checkUser, deleteMaps, getMaps };
