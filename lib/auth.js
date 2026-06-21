/**
 * ============================================================
 *  lib/auth.js
 * ------------------------------------------------------------
 *  Helper untuk hashing password (bcryptjs) dan pembuatan /
 *  verifikasi token sesi login (jsonwebtoken).
 * ============================================================
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "trithink-ai-dev-secret-CHANGE-THIS";
const TOKEN_EXPIRY = "7d";

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return { valid: true, data: jwt.verify(token, JWT_SECRET) };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Ambil token dari header Authorization: Bearer xxx, atau dari
 * cookie "tt_token" jika header tidak ada.
 */
function extractToken(req) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/tt_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Middleware-style helper: validasi request, kembalikan user
 * payload atau null.
 */
function getUserFromRequest(req) {
  const token = extractToken(req);
  if (!token) return null;
  const result = verifyToken(token);
  if (!result.valid) return null;
  return result.data;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  extractToken,
  getUserFromRequest,
};
