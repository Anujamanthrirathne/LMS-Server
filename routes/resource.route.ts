import {

  createResource,
  deleteResource,
  getResourceById,
  getResources,
  incrementDownloadCount,
  updateResource,
} from "./../controllers/resource.controller";
import { updateAccessToken } from "./../controllers/user.controller";
import { isAuthenticated, authorizeRoles } from "./../middleware/auth";
import express from "express";

const resourceRouter = express.Router();


resourceRouter.post(
  "/create-resource",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  createResource
);

resourceRouter.put(
  "/edit-resource/:id",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateResource
);

resourceRouter.get("/get-resource", getResources);

resourceRouter.get("/get-resource/:id",getResourceById);

resourceRouter.delete(
    "/delete-resource/:id",
    updateAccessToken,
    isAuthenticated,
    authorizeRoles("admin"),
    deleteResource
);

resourceRouter.put("/count-resource/:id",incrementDownloadCount);
 
export default resourceRouter;
