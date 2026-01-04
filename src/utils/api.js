import { API_URL } from "@/constants";
import Cookies from "js-cookie";
import { logout } from "./auth";

function getToken() {
  let user = Cookies.get("user");
  if (user) user = JSON.parse(user);
  return user.token;
}

async function get(url) {
  const result = await fetch(url, {
    method: "GET",
    headers: { authorization: `Bearer ${getToken()}` },
  });
  return result;
}
async function del({ url, body }) {
  const result = await fetch(url, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${getToken()}`,
      ...(body && { "Content-Type": "application/json" }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return result;
}
async function post({ url, body }) {
  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  return result;
}
async function put({ url, body }) {
  const result = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  return result;
}

// user data
export const getUserData = async () => {
  const result = await get(`${API_URL}/me`);
  if (result.status == 404) logout();
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
  const result = await get(`${API_URL}/admin/accounts/${id}`);
  return result;
};
export const deletSystemUserById = async (id) => {
  const result = await del({
    url: `${API_URL}/admin/accounts/${id}`,
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
  const result = await get(`${API_URL}/my/projects/${code}`);
  return result;
};

export const deleteProjectByCode = async (code) => {
  const result = await del({ url: `${API_URL}/my/projects/${code}` });
  return result;
};

export const updateProjectByCode = async ({ code, data }) => {
  const result = await put({
    url: `${API_URL}/my/projects/${code}`,
    body: data,
  });
  return result;
};

export const checkCodeValidity = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/check-code/${code}`);
  return result;
};

// creds
export const getProjectCreds = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/${code}/creds`);
  return result;
};
export const addProjectCreds = async ({ code, data }) => {
  const result = await post({
    url: `${API_URL}/my/projects/${code}/creds`,
    body: data,
  });
  return result;
};
export const deleteProjectCreds = async ({ code, id }) => {
  const result = await del({
    url: `${API_URL}/my/projects/${code}/creds/${id}`,
  });
  return result;
};

// rules
export const loadDbRules = async ({ code }) => {
  const result = await get(`${API_URL}/my/projects/${code}/db/rules`);
  return result;
};

export const saveDbRules = async ({ code, rules }) => {
  const result = await put({
    url: `${API_URL}/my/projects/${code}/db/rules`,
    body: rules,
  });
  return result;
};

// auth
export const getAuthAccounts = async ({
  projectCode,
  where = {},
  page = 1,
  limit = 40,
}) => {
  const result = await post({
    url: `${API_URL}/projects/${projectCode}/auth/accounts`,
    body: { where, page, limit },
  });
  return result;
};

export const addAccountUser = async ({ projectCode, data }) => {
  const result = await post({
    url: `${API_URL}/projects/${projectCode}/auth/accounts/add`,
    body: data,
  });
  return result;
};
export const updateAccountData = async ({ projectCode, docId, data }) => {
  const result = await put({
    url: `${API_URL}/projects/${projectCode}/auth/accounts/${docId}`,
    body: data,
  });
  return result;
};
export const deleteAccount = async ({ projectCode, docId }) => {
  const result = await del({
    url: `${API_URL}/projects/${projectCode}/auth/accounts/${docId}`,
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
    url: `${API_URL}/projects/${projectCode}/storage/buckets`,
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
  const queryParams = `ipp=${ipp}&page=${page}`;
  const result = await get(
    `${API_URL}/projects/${projectCode}/storage/buckets/${bucketId}/content?${queryParams}`
  );
  return result;
};
export const deleteStorageBucket = async ({ projectCode, bucketId }) => {
  const result = await del({
    url: `${API_URL}/projects/${projectCode}/storage/buckets/${bucketId.toString()}`,
  });
  return result;
};
export const updateStorageBucket = async ({ projectCode, bucketId, data }) => {
  const result = await put({
    url: `${API_URL}/projects/${projectCode}/storage/buckets/${bucketId.toString()}`,
    body: data,
  });
  return result;
};

// files
export const deleteStorageFile = async ({ projectCode, fileId }) => {
  const result = await del({
    url: `${API_URL}/projects/${projectCode}/storage/files/${fileId.toString()}`,
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
    url: `${API_URL}/projects/${projectCode}/db/collections`,
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
    url: `${API_URL}/projects/${projectCode}/db/${collectionName}`,
    body: { page, sort: { createdAt: -1 }, limit },
  });
  return result;
};
export const createNewCollection = async ({ projectCode, collectionName }) => {
  const result = await post({
    url: `${API_URL}/projects/${projectCode}/db/collections/new`,
    body: { name: collectionName },
  });
  return result;
};
export const deleteCollection = async ({ projectCode, collectionName }) => {
  const result = await del({
    url: `${API_URL}/projects/${projectCode}/db/${collectionName}`,
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
    `${API_URL}/projects/${projectCode}/db/${collectionName}/${docId}`
  );
  return result;
};

export const createDocument = async ({ projectCode, collectionName, data }) => {
  const result = await post({
    url: `${API_URL}/projects/${projectCode}/db/${collectionName}/add`,
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
    url: `${API_URL}/projects/${projectCode}/db/${collectionName}/${docId.toString()}`,
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
    url: `${API_URL}/projects/${projectCode}/db/${collectionName}/${docId.toString()}`,
  });
  return result;
};
