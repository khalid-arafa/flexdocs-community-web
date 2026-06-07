import { API_URL } from "@/constants";
import Cookies from "js-cookie";
import { logout, logoutAndRedirect } from "./auth";

const UNAUTHORIZED_STATUS = new Set([401, 403]);

function parseUserCookie() {
  const userCookie = Cookies.get("user");
  if (!userCookie) return null;
  try {
    return JSON.parse(userCookie);
  } catch {
    logoutAndRedirect();
    return null;
  }
}

function getToken() {
  const user = parseUserCookie();
  return user?.token || null;
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getToken();
  return {
    ...extraHeaders,
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function withAuthHandling(result) {
  if (UNAUTHORIZED_STATUS.has(result.status)) {
    try {
      const body = await result.clone().json();
      if (body.expired) {
        logoutAndRedirect("/login?session=expired");
        return result;
      }
    } catch { /* ignore parse errors */ }
    logoutAndRedirect();
  }
  return result;
}

async function get(url) {
  const result = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return withAuthHandling(result);
}
async function del({ url, body }) {
  const result = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders({
      ...(body && { "Content-Type": "application/json" }),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
  return withAuthHandling(result);
}
async function post({ url, body }) {
  const result = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  return withAuthHandling(result);
}
async function put({ url, body }) {
  const result = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  return withAuthHandling(result);
}

// user data
export const getUserData = async () => {
  const result = await get(`${API_URL}/me`);
  if (result.status === 404) logout();
  return result;
};

export const updateUser = async (data) => {
  const result = await put({ url: `${API_URL}/me`, body: data });
  return result;
};

export const deleteUser = async () => {
  const result = await del({ url: `${API_URL}/me` });
  return result;
};

// admin
export const getSystemUserById = async (id) => {
  const result = await get(`${API_URL}/admin/accounts/${encodeURIComponent(id)}`);
  return result;
};
export const deletSystemUserById = async (id) => {
  const result = await del({
    url: `${API_URL}/admin/accounts/${encodeURIComponent(id)}`,
  });
  return result;
};
export const getAllProjects = async ({ query, page = 1, ipp = 40 }) => {
  const result = await post({
    url: `${API_URL}/admin/projects`,
    body: { page, ipp, query },
  });
  return result;
};

// email settings (system admin)
export const getEmailConfig = async () => {
  const result = await get(`${API_URL}/settings/email`);
  return result;
};

export const updateEmailConfig = async (data) => {
  const result = await put({ url: `${API_URL}/settings/email`, body: data });
  return result;
};

export const sendTestEmail = async (to) => {
  const result = await post({
    url: `${API_URL}/settings/email/test`,
    body: to ? { to } : {},
  });
  return result;
};

// projects
export const createProject = async ({ name, code, description, isPublic }) => {
  const result = await post({
    url: `${API_URL}/my/projects`,
    body: { name, code, description, isPublic },
  });
  return result;
};

export const getUserProjects = async () => {
  const result = await get(`${API_URL}/my/projects`);
  return result;
};

export const getProjectByCode = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/${encodeURIComponent(code)}`);
  return result;
};

export const deleteProjectByCode = async (code) => {
  const result = await del({ url: `${API_URL}/my/projects/${encodeURIComponent(code)}` });
  return result;
};

export const updateProjectByCode = async ({ code, data }) => {
  const result = await put({
    url: `${API_URL}/my/projects/${encodeURIComponent(code)}`,
    body: data,
  });
  return result;
};

export const checkCodeValidity = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/check-code/${encodeURIComponent(code)}`);
  return result;
};

// creds
export const getProjectCreds = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/${encodeURIComponent(code)}/creds`);
  return result;
};
export const addProjectCreds = async ({ code, data }) => {
  const result = await post({
    url: `${API_URL}/my/projects/${encodeURIComponent(code)}/creds`,
    body: data,
  });
  return result;
};
export const deleteProjectCreds = async ({ code, id }) => {
  const result = await del({
    url: `${API_URL}/my/projects/${encodeURIComponent(code)}/creds/${encodeURIComponent(id)}`,
  });
  return result;
};

// rules
export const loadDbRules = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/${encodeURIComponent(code)}/db/rules`);
  return result;
};

export const saveDbRules = async ({ code, rules }) => {
  const result = await put({
    url: `${API_URL}/my/projects/${encodeURIComponent(code)}/db/rules`,
    body: rules,
  });
  return result;
};

// auth rules
export const loadAuthRules = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/${encodeURIComponent(code)}/auth/rules`);
  return result;
};

export const saveAuthRules = async ({ code, rules }) => {
  const result = await put({
    url: `${API_URL}/my/projects/${encodeURIComponent(code)}/auth/rules`,
    body: rules,
  });
  return result;
};

// auth
export const getAuthAccounts = async ({
  projectCode,
  query = {},
  page = 1,
  limit = 40,
}) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/auth/accounts`,
    body: { query, page, limit },
  });
  return result;
};

export const addAccountUser = async ({ projectCode, data }) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/auth/accounts/add`,
    body: data,
  });
  return result;
};
export const updateAccountData = async ({ projectCode, docId, data }) => {
  const result = await put({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/auth/accounts/${encodeURIComponent(docId)}`,
    body: data,
  });
  return result;
};
export const deleteAccount = async ({ projectCode, docId }) => {
  const result = await del({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/auth/accounts/${encodeURIComponent(docId)}`,
  });
  return result;
};

// storage
// buckets
export const createStorageBucket = async ({
  projectCode,
  name,
  description,
  parentId,
}) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/storage/buckets`,
    body: { name, description, parentId },
  });
  return result;
};
export const getBucketContent = async ({
  projectCode,
  bucketId,
  ipp = 20,
  page = 1,
}) => {
  const queryParams = new URLSearchParams({ ipp, page }).toString();
  const result = await get(
    `${API_URL}/projects/${encodeURIComponent(projectCode)}/storage/buckets/${encodeURIComponent(bucketId)}/content?${queryParams}`
  );
  return result;
};
export const deleteStorageBucket = async ({ projectCode, bucketId }) => {
  const result = await del({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/storage/buckets/${encodeURIComponent(bucketId)}`,
  });
  return result;
};
export const updateStorageBucket = async ({ projectCode, bucketId, data }) => {
  const result = await put({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/storage/buckets/${encodeURIComponent(bucketId)}`,
    body: data,
  });
  return result;
};

// files
export const deleteStorageFile = async ({ projectCode, fileId }) => {
  const result = await del({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/storage/files/${encodeURIComponent(fileId)}`,
  });
  return result;
};

//
//
// database
export const getDatabaseCollections = async ({
  projectCode,
  where = {},
  page = 1,
  limit = 40,
}) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/collections`,
    body: { where, page, limit },
  });
  return result;
};
export const getCollectionDocuments = async ({
  projectCode,
  collectionName,
  page = 1,
  limit = 40,
}) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/${encodeURIComponent(collectionName)}`,
    body: { page, sort: { createdAt: -1 }, limit },
  });
  return result;
};
export const createNewCollection = async ({ projectCode, collectionName }) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/collections/new`,
    body: { name: collectionName },
  });
  return result;
};
export const renameCollection = async ({ projectCode, collectionName, newName }) => {
  const result = await put({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/collections/${encodeURIComponent(collectionName)}/rename`,
    body: { newName },
  });
  return result;
};
export const deleteCollection = async ({ projectCode, collectionName }) => {
  const result = await del({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/${encodeURIComponent(collectionName)}`,
    data: { filter: {} },
  });
  return result;
};

export const getDocumentById = async ({
  projectCode,
  collectionName,
  docId,
}) => {
  const result = await get(
    `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`
  );
  return result;
};

export const createDocument = async ({ projectCode, collectionName, data }) => {
  const result = await post({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/${encodeURIComponent(collectionName)}/add`,
    body: data,
  });
  return result;
};

export const saveDocument = async ({
  projectCode,
  collectionName,
  docId,
  data,
}) => {
  const result = await put({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`,
    body: { type: "replace", data },
  });
  return result;
};

export const deleteDocument = async ({
  projectCode,
  collectionName,
  docId,
}) => {
  const result = await del({
    url: `${API_URL}/projects/${encodeURIComponent(projectCode)}/db/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`,
  });
  return result;
};
