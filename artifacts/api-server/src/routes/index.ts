import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import peopleRouter from "./people.js";
import configRouter from "./config.js";
import groupsRouter from "./groups.js";
import arrangementsRouter from "./arrangements.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/people", peopleRouter);
router.use("/config", configRouter);
router.use("/groups", groupsRouter);
router.use("/arrangements", arrangementsRouter);

export default router;
