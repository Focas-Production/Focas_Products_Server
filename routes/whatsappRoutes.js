import express from "express";
import { auditCourseTemplate ,rtiTemplate,plannerTemplate , createChatzealContact} from "../controllers/whatsappController.js";

const router = express.Router();

router.post("/audit-template", auditCourseTemplate);

router.post("/rti-template",rtiTemplate)

router.post("/planner-template",plannerTemplate) 

router.post("/create-contact",createChatzealContact)

export default router;
