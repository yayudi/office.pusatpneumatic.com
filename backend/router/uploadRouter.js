import { Router } from "express";
import { getPresignedUrl } from "../controllers/uploadController.js";

const uploadRouter = Router();

// Endpoint ini membutuhkan autentikasi yang di-handle di index.js (atau bisa diletakkan middleware khusus di sini)
uploadRouter.post("/presigned-url", getPresignedUrl);

export default uploadRouter;
