import express from "express";
import {
  registerAdmin,
  getAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin
} from "../controllers/admin.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";
const router = express.Router();

router.post("/register", registerAdmin);
router.get("/:id", getAdmin);
router.get("/", getAdmins);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

export default router;
