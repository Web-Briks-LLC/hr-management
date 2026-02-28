import { Router } from "express";
import {
    createOrder,
    getAllOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    extendDeadline,
    addRevision,
    getOrderStats,
    getOrdersByClient,
    getOrderYears,
} from "../controllers/order.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

const router = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];
const extendedRoles = [...allowedRoles, Role.TEAM_LEADER, Role.STAFF];

router.post("/", authorize(...allowedRoles), createOrder);
router.get("/", authorize(...extendedRoles), getAllOrders);
router.get("/stats", authorize(...allowedRoles), getOrderStats);
router.get("/years", authorize(...allowedRoles), getOrderYears);
router.get("/client/:clientId", authorize(...allowedRoles), getOrdersByClient);
router.get("/:id", authorize(...extendedRoles), getOrderById);
router.patch("/:id", authorize(...allowedRoles), updateOrder);
router.patch("/:id/status", authorize(...allowedRoles), updateOrderStatus);
router.patch(
    "/:id/extend-deadline",
    authorize(...allowedRoles),
    extendDeadline,
);
router.post("/:id/revision", authorize(...allowedRoles), addRevision);
router.delete("/:id", authorize(...allowedRoles), deleteOrder);

export { router as orderRoute };
