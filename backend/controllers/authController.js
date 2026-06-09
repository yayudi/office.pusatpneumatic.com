// backend/controllers/authController.js
import * as authService from "../services/authService.js";

/**
 * Controller untuk login user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { token, user } = await authService.loginService(username, password, req.ip, req.headers["user-agent"]);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller untuk logout user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export const logout = (req, res) => {
  res.json({ success: true, message: "Logged out" });
};
