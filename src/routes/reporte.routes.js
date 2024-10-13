import express from "express";
import {
  getDashboardSummary,
  getAppointmentsStats,
  getPatientsStats,
  getSpecialtiesDistribution,
  getUpcomingAppointments,
  getReingresoRate,
  getAppointmentsStatusStats,
  getConsultationReport,
  getReservationReport,
  getPatientReport,
  getDoctorReport
} from "../controllers/reporte.controller.js";
import { checkAuth } from "../middlewares/auth.middlleware.js";

const router = express.Router();

function prueba(req, res) {
  res.send("Hola Mundo");
}

// Rutas para reportes del dashboard
router.get('/dashboard/summary', getDashboardSummary);
router.get('/appointments/stats', getAppointmentsStats);
router.get('/patients/stats', getPatientsStats);
router.get('/specialties/distribution', getSpecialtiesDistribution);
router.get('/appointments/upcoming', getUpcomingAppointments);
router.get('/reingreso/rate', getReingresoRate);
router.get('/appointments/status-stats', getAppointmentsStatusStats);

router.get('/consultation-report', getConsultationReport);

router.get('/reservation-report', getReservationReport);

router.get('/patient-report', getPatientReport);

router.get('/doctor-report', getDoctorReport);
router.get("/", prueba);

export default router;










