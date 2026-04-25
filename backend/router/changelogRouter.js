import { Router } from "express";
import * as changelogController from "../controllers/changelogController.js";

const router = Router();

router.get("/", changelogController.getChangelogs);

export default router;
