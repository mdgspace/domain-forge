import { MongoClient } from "./dependencies.ts";
import getProviderUser from "./utils/get-user.ts";
import DfContentMap from "./types/maps_interface.ts";

// Initialize MongoClient with npm driver
const MONGO_URI = Deno.env.get("MONGO_URI");
const client = MONGO_URI ? new MongoClient(MONGO_URI) : null;

console.log("--- DB INIT DEBUG ---");
console.log("CWD:", Deno.cwd());
console.log("MONGO_URI Present:", !!MONGO_URI);
if (MONGO_URI) console.log("MONGO_URI Length:", MONGO_URI.length);
else console.log("⚠️  MONGO_URI IS MISSING from environment!");
console.log("---------------------");

let db: any;
let userAuthCollection: any;
let contentMapsCollection: any;

try {
  if (MONGO_URI && client) {
    console.log("Attempting to connect to MongoDB...");
    await client.connect();
    db = client.db("df_test");
    userAuthCollection = db.collection("user_auth");
    contentMapsCollection = db.collection("content_maps");
    console.log("✅ Connected to MongoDB successfully");
  } else {
    console.error("❌ SKIPPING DB CONNECTION: MONGO_URI is missing.");
  }
} catch (error) {
  console.error("❌ Failed to connect to MongoDB:", error);
}

// Function to update access token on db if user exists
async function checkUser(accessToken: string, provider: string) {
  // Check if database connection is available
  if (!userAuthCollection) {
    console.error("Database connection not available. userAuthCollection is undefined.");
    throw new Error("Database connection not available. Please check MONGO_URI environment variable and MongoDB connectivity.");
  }

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
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
  const filter = ADMIN_LIST?.includes(author) ? {} : { "author": author };

  // Convert deprecated simple filter to standard mongo filter if needed
  // But here we use native driver which expects filter object directly.
  const data = await contentMapsCollection.find(filter).toArray();
  return { documents: data };
}

// Add content maps
async function addMaps(document: DfContentMap) {
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
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
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
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

// Webhook helper
async function getDeploymentsByRepo(repoUrl: string) {
  if (!contentMapsCollection) return [];
  
  // Clean URL by stripping trailing slashes and .git to normalize
  const cleanUrl = repoUrl.replace(/\/+$/, '').replace(/\.git$/, '');
  
  // Create a regex to match either exact, with trailing slash, or with .git
  const escapedUrl = cleanUrl.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const regexPattern = `^${escapedUrl}/?(?:\\.git)?$`;
  
  return await contentMapsCollection.find({ 
    resource: { $regex: regexPattern, $options: 'i' }, 
    enable_ci: true 
  }).toArray();
}

async function getUserToken(userId: string) {
  if (!userAuthCollection) return null;
  const user = await userAuthCollection.findOne({ 
    $or: [ { githubId: userId }, { gitlabId: userId } ] 
  });
  return user?.authToken;
}

export { addMaps, checkUser, deleteMaps, getMaps, getDeploymentsByRepo, getUserToken };
