import getProviderUser from "./utils/get-user.ts";
import DfContentMap from "./types/maps_interface.ts";
import type { EncryptedData } from "./utils/encryption.ts";

const DATA_API_KEY = Deno.env.get("MONGO_API_KEY")!;
const APP_ID = Deno.env.get("MONGO_APP_ID");

const BASE_URI =
  `https://ap-south-1.aws.data.mongodb-api.com/app/${APP_ID}/endpoint/data/v1`;
const DATA_SOURCE = "domain-forge-demo-db";
const DATABASE = "df_test";
const options = {
  method: "POST",
  headers: {
    "Accept": "*/*",
    "Content-Type": "application/json",
    "Access-Control-Request-Headers": "*",
    "api-key": DATA_API_KEY,
  },
  body: "",
};

const MONGO_URLs = {
  update: new URL(`${BASE_URI}/action/updateOne`),
  find: new URL(`${BASE_URI}/action/find`),
  insert: new URL(`${BASE_URI}/action/insertOne`),
  delete: new URL(`${BASE_URI}/action/deleteOne`),
};

interface StoredSecret {
  subdomain: string;
  encrypted_secrets: string;
  iv: string;
  tag: string;
  created_at: string;
  updated_at: string;
  version: number;
}

interface VolumeMetadata {
  subdomain: string;
  volume_name: string;
  mount_path: string;
  created_at: string;
  last_used_at: string;
}

// Function to update access token on db if user exists
async function checkUser(accessToken: string, provider: string) {
  const userId = await getProviderUser(accessToken, provider);

  const query = {
    collection: "user_auth",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { [`${provider}Id`]: userId },
    update: {
      $set: {
        [`${provider}Id`]: userId,
        "authToken": accessToken,
      },
    },
  };

  options.body = JSON.stringify(query);

  const status_resp = await fetch(MONGO_URLs.update.toString(), options);
  const status = await status_resp.json();
  return { status, userId };
}

// Get all content maps corresponding to user
async function getMaps(author: string, ADMIN_LIST: string[]) {
  const filter = ADMIN_LIST?.includes(author) ? {} : { "author": author };
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: filter,
  };
  options.body = JSON.stringify(query);
  const resp = await fetch(MONGO_URLs.find.toString(), options);
  const data = await resp.json();
  return data;
}

// Add content maps
async function addMaps(document: DfContentMap) {
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": document.subdomain },
  };
  options.body = JSON.stringify(query);

  let resp = await fetch(MONGO_URLs.find.toString(), options);
  let data = await resp.json();

  if (data.documents.length == 0) {
    const query = {
      collection: "content_maps",
      database: DATABASE,
      dataSource: DATA_SOURCE,
      document: document,
    };

    options.body = JSON.stringify(query);
    resp = await fetch(MONGO_URLs.insert.toString(), options);
    data = await resp.json();

    return (data.insertedId !== undefined);
  } else {
    return false;
  }
}

// Delete content maps
async function deleteMaps(document: DfContentMap, ADMIN_LIST: string[]) {
  const filter = JSON.parse(JSON.stringify(document));
  if (ADMIN_LIST.includes(document.author)) {
    delete filter.author;
  }
  const query = {
    collection: "content_maps",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: filter,
  };
  options.body = JSON.stringify(query);

  const resp = await fetch(MONGO_URLs.delete.toString(), options);
  const data = await resp.json();

  return data;
}

// Get encrypted secrets for a project
async function getSecretsForProject(subdomain: string): Promise<StoredSecret | null> {
  const query = {
    collection: "project_secrets",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": subdomain },
  };
  options.body = JSON.stringify(query);
  
  const resp = await fetch(MONGO_URLs.find.toString(), options);
  const data = await resp.json();
  
  if (data.documents && data.documents.length > 0) {
    return data.documents[0] as StoredSecret;
  }
  return null;
}

async function upsertSecrets(
  subdomain: string,
  encryptedData: EncryptedData,
): Promise<boolean> {
  const now = new Date().toISOString();
  
  const existing = await getSecretsForProject(subdomain);
  
  const document: StoredSecret = {
    subdomain: subdomain,
    encrypted_secrets: encryptedData.encrypted,
    iv: encryptedData.iv,
    tag: encryptedData.tag,
    created_at: existing?.created_at || now,
    updated_at: now,
    version: existing ? existing.version + 1 : 1,
  };

  if (existing) {
    const query = {
      collection: "project_secrets",
      database: DATABASE,
      dataSource: DATA_SOURCE,
      filter: { "subdomain": subdomain },
      update: {
        $set: {
          encrypted_secrets: document.encrypted_secrets,
          iv: document.iv,
          tag: document.tag,
          updated_at: document.updated_at,
          version: document.version,
        },
      },
    };
    options.body = JSON.stringify(query);
    
    const resp = await fetch(MONGO_URLs.update.toString(), options);
    const data = await resp.json();
    
    return data.matchedCount === 1;
  } else {
    const query = {
      collection: "project_secrets",
      database: DATABASE,
      dataSource: DATA_SOURCE,
      document: document,
    };
    options.body = JSON.stringify(query);
    
    const resp = await fetch(MONGO_URLs.insert.toString(), options);
    const data = await resp.json();
    
    return data.insertedId !== undefined;
  }
}

async function deleteSecretsForProject(subdomain: string): Promise<boolean> {
  const query = {
    collection: "project_secrets",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": subdomain },
  };
  options.body = JSON.stringify(query);
  
  const resp = await fetch(MONGO_URLs.delete.toString(), options);
  const data = await resp.json();
  
  return data.deletedCount > 0;
}

async function getVolumeMetadata(subdomain: string): Promise<VolumeMetadata | null> {
  const query = {
    collection: "volume_metadata",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": subdomain },
  };
  options.body = JSON.stringify(query);
  
  const resp = await fetch(MONGO_URLs.find.toString(), options);
  const data = await resp.json();
  
  if (data.documents && data.documents.length > 0) {
    return data.documents[0] as VolumeMetadata;
  }
  return null;
}

async function upsertVolumeMetadata(
  subdomain: string,
  volumeName: string,
  mountPath: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const existing = await getVolumeMetadata(subdomain);
  
  const document: VolumeMetadata = {
    subdomain: subdomain,
    volume_name: volumeName,
    mount_path: mountPath,
    created_at: existing?.created_at || now,
    last_used_at: now,
  };

  if (existing) {
    const query = {
      collection: "volume_metadata",
      database: DATABASE,
      dataSource: DATA_SOURCE,
      filter: { "subdomain": subdomain },
      update: {
        $set: {
          last_used_at: document.last_used_at,
        },
      },
    };
    options.body = JSON.stringify(query);
    
    const resp = await fetch(MONGO_URLs.update.toString(), options);
    const data = await resp.json();
    
    return data.matchedCount === 1;
  } else {
    const query = {
      collection: "volume_metadata",
      database: DATABASE,
      dataSource: DATA_SOURCE,
      document: document,
    };
    options.body = JSON.stringify(query);
    
    const resp = await fetch(MONGO_URLs.insert.toString(), options);
    const data = await resp.json();
    
    return data.insertedId !== undefined;
  }
}

async function deleteVolumeMetadata(subdomain: string): Promise<boolean> {
  const query = {
    collection: "volume_metadata",
    database: DATABASE,
    dataSource: DATA_SOURCE,
    filter: { "subdomain": subdomain },
  };
  options.body = JSON.stringify(query);
  
  const resp = await fetch(MONGO_URLs.delete.toString(), options);
  const data = await resp.json();
  
  return data.deletedCount > 0;
}

export {
  addMaps,
  checkUser,
  deleteMaps,
  getMaps,
  getSecretsForProject,
  upsertSecrets,
  deleteSecretsForProject,
  getVolumeMetadata,
  upsertVolumeMetadata,
  deleteVolumeMetadata,
};
