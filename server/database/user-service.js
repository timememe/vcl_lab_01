import { userQueries } from './db.js';

export async function findUserByUsername(username) {
  return userQueries.findByUsername.get(username);
}

export async function findUserById(userId) {
  return userQueries.findById.get(userId);
}

export async function createUser(username, passwordHash, role, assignedBrands, dailyCreditLimit = 0) {
  const result = userQueries.create.run(username, passwordHash, role, assignedBrands, dailyCreditLimit);
  return userQueries.findById.get(result.lastInsertRowid);
}

export async function updateUserCore(username, role, assignedBrands, dailyCreditLimit, userId) {
  userQueries.updateCore.run(username, role, assignedBrands, dailyCreditLimit, userId);
  return userQueries.findById.get(userId);
}

export async function updateUserPassword(passwordHash, userId) {
  userQueries.updatePassword.run(passwordHash, userId);
}

export async function deleteUser(userId) {
  userQueries.delete.run(userId);
}

export async function listUsers() {
  return userQueries.list.all();
}

export async function countAdmins() {
  return userQueries.countAdmins.get();
}
