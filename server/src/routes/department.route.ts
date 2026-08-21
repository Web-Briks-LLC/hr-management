import { Router } from "express";
import { Role } from "../constants/role.js";
import { authorize } from "../middlewares/authorize.js";
import DepartmentControllers from "../controllers/department.controller.js";

const router: Router = Router();

router.post(
    "/",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DepartmentControllers.createDepartment
);

router.get(
    "/",
    DepartmentControllers.getAllDepartments
);

router.put(
    "/:id",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DepartmentControllers.updateDepartment
);

router.delete(
    "/:id",
    authorize(Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER),
    DepartmentControllers.deleteDepartment
);

export const departmentRoute = router;
