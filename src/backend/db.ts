import { MongoClient } from "./dependencies.ts";
import getProviderUser from "./utils/get-user.ts";
import DfContentMap from "./types/maps_interface.ts";
import { isSuperAdmin } from "./utils/jwt.ts";

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

  // Allow users from ADMIN_LIST or SUPER_ADMIN_LIST
  const allowedUsers = [
    ...(Deno.env.get("ADMIN_LIST")?.split("|") || []),
    ...(Deno.env.get("SUPER_ADMIN_LIST")?.split("|") || []),
  ].map((s) => s.trim()).filter(Boolean);

  if (!allowedUsers.includes(userId)) {
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

// Get all content maps corresponding to user (or all if super admin)
async function getMaps(author: string, isSuperAdminUser = false) {
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
  const filter = isSuperAdminUser ? {} : { "author": author };
  const data = await contentMapsCollection.find(filter).toArray();
  return { documents: data };
}

// Get list of subdomains owned by a specific user
async function getUserSubdomains(author: string): Promise<string[]> {
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
  const docs = await contentMapsCollection
    .find({ "author": author }, { projection: { subdomain: 1 } })
    .toArray();
  return docs.map((d: any) => d.subdomain);
}

// Verify whether a user owns a subdomain or has super admin privileges
async function verifySubdomainOwnership(user: string, subdomain: string): Promise<boolean> {
  if (!user || !subdomain) return false;
  if (isSuperAdmin(user)) return true;
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
  const doc = await contentMapsCollection.findOne({ subdomain, author: user });
  return !!doc;
}

// Add content maps
async function addMaps(document: DfContentMap) {
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
  // Check existence
  const existing = await contentMapsCollection.findOne({ "subdomain": document.subdomain });

  if (!existing) {
    document.status = "PENDING";
    const insertId = await contentMapsCollection.insertOne(document);
    return (insertId !== undefined);
  } else {
    return false;
  }
}

// Delete content maps
async function deleteMaps(document: DfContentMap, isSuperAdminUser = false) {
  if (!contentMapsCollection) {
    throw new Error("Database connection not available.");
  }
  const filter: any = { subdomain: document.subdomain };
  if (!isSuperAdminUser) {
    filter.author = document.author;
  }

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
    resource_type: 'GITHUB',
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

export {
  addMaps,
  checkUser,
  deleteMaps,
  getDeploymentsByRepo,
  getMaps,
  getUserSubdomains,
  getUserToken,
  verifySubdomainOwnership,
};
