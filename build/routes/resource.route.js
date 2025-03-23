"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const resource_controller_1 = require("./../controllers/resource.controller");
const user_controller_1 = require("./../controllers/user.controller");
const auth_1 = require("./../middleware/auth");
const express_1 = __importDefault(require("express"));
const resourceRouter = express_1.default.Router();
resourceRouter.post("/create-resource", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), resource_controller_1.createResource);
resourceRouter.put("/edit-resource/:id", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), resource_controller_1.updateResource);
resourceRouter.get("/get-resource", resource_controller_1.getResources);
resourceRouter.get("/get-resource/:id", resource_controller_1.getResourceById);
resourceRouter.delete("/delete-resource/:id", user_controller_1.updateAccessToken, auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("admin"), resource_controller_1.deleteResource);
resourceRouter.put("/count-resource/:id", resource_controller_1.incrementDownloadCount);
exports.default = resourceRouter;
