import express from "express";
import { createGameSession, updateGameSession, getAllGameSession } from "../controllers/gameSession.controller.js";
const router = express.Router();
router.post("/",createGameSession);
router.get("/", getAllGameSession);
router.put("/:whatsapp/:attemptNumber", updateGameSession);



export default router;