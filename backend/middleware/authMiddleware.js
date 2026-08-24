// backend\middleware\authMiddleware.js
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

function authenticateToken(req, res, next) {
  let token;
  const authHeader = req.headers["authorization"];

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError("Akses ditolak. Token tidak ditemukan.", 401));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Sesi Anda telah berakhir. Silakan login kembali."
          : "Token tidak valid.";

      return next(new AppError(message, 401, "TOKEN_EXPIRED"));
    }

    req.user = user;
    next();
  });
}

export default authenticateToken;
