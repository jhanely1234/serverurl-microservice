import express from 'express';
import { createUser, getMe, getPacientes, getPaciente, updatePaciente, deletePaciente } from '../controllers/paciente.controller.js';
import { checkAuth } from '../middlewares/auth.middlleware.js';
const router = express.Router();

router.post('/create', createUser);
router.get('/me',  getMe);
router.get('/',  getPacientes);
router.get('/:id',  getPaciente);
router.put('/:id',  updatePaciente);
router.delete('/:id',  deletePaciente);

export default router;
