import { Router } from "express";
import { Role } from "../constants/role.js";
import { authorize } from "../middlewares/authorize.js";
import DesignationControllers from "../controllers/designation.controller.js";

const router: Router = Router();

router.post(
    "/",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DesignationControllers.createDesignation
);

router.get(
    "/",
    DesignationControllers.getAllDesignations
);

router.put(
    "/:id",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DesignationControllers.updateDesignation
);

router.delete(
    "/:id",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DesignationControllers.deleteDesignation
);

export const designationRoute = router;
