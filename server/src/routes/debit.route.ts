import { Router } from "express";
import {
    createPerson,
    getPersons,
    updatePerson,
    deletePerson,
    createDebit,
    getDebits,
    updateDebit,
    deleteDebit,
    getDebitStats,
} from "../controllers/debit.controller.js";
import { authorize } from "../middlewares/authorize.js";
import { Role } from "../constants/role.js";

export const debitRoute = Router();

const allowedRoles = [Role.SUPER_ADMIN, Role.ADMIN, Role.HR_MANAGER];

// Persons
debitRoute.post("/persons", authorize(...allowedRoles), createPerson);
debitRoute.get("/persons", authorize(...allowedRoles), getPersons);
debitRoute.put("/persons/:id", authorize(...allowedRoles), updatePerson);
debitRoute.delete("/persons/:id", authorize(...allowedRoles), deletePerson);

// Debits
debitRoute.post("/debits", authorize(...allowedRoles), createDebit);
debitRoute.get("/debits", authorize(...allowedRoles), getDebits);
debitRoute.put("/debits/:id", authorize(...allowedRoles), updateDebit);
debitRoute.delete("/debits/:id", authorize(...allowedRoles), deleteDebit);

// Stats
debitRoute.get("/stats", authorize(...allowedRoles), getDebitStats);
