import express from "express";
import { createAssistant, createChatPerAssistant, getAllAssistants } from "../controllers/assistantController.js";

const router = express.Router();

router.post("/", createAssistant);
router.get("/all", getAllAssistants)
router.post("/:assistantId/chat", createChatPerAssistant); 



export default router;
