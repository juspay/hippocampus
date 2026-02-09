import { Router } from 'express';
import { createEngramRoutes } from './engram.routes.js';
import { createChronicleRoutes, createNexusRoutes } from './chronicle.routes.js';
import { createSystemRoutes } from './system.routes.js';
import { EngramController } from '../controllers/engram.controller.js';
import { ChronicleController } from '../controllers/chronicle.controller.js';
import { SystemController } from '../controllers/system.controller.js';

export interface RouteControllers {
  engram: EngramController;
  chronicle: ChronicleController;
  system: SystemController;
}

export function mountRoutes(controllers: RouteControllers): Router {
  const router = Router();

  router.use('/engrams', createEngramRoutes(controllers.engram));
  router.use('/chronicles', createChronicleRoutes(controllers.chronicle));
  router.use('/nexuses', createNexusRoutes(controllers.chronicle));

  // System routes mounted at root level
  const systemRoutes = createSystemRoutes(controllers.system);
  router.use('/', systemRoutes);

  return router;
}
