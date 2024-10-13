import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { dbConnect } from './db/config.js';
import pacienteRouter from './routes/paciente.routes.js';
import authRouter from './routes/auth.routes.js';
import especialidadRouter from './routes/especialidad.routes.js';
import medicoRouter from './routes/medico.routes.js';
import adminRouter from './routes/admin.routes.js';
import reservaRouter from './routes/reserva.routes.js';
import historialRouter from './routes/historial.routes.js';
import consultaRouter from './routes/consulta.routes.js';
import reporteRouter from './routes/reporte.routes.js';
import "./libs/initialSetup.js";

const server = express();

// Variables de entorno
dotenv.config();

// Middleware
server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

// Inicializar base de datos
dbConnect();

// Rutas
server.use('/api/paciente', pacienteRouter);
server.use('/api/auth', authRouter);
server.use('/api/especialidad', especialidadRouter);
server.use('/api/medico', medicoRouter);
server.use('/api/admin', adminRouter);
server.use('/api/reserva', reservaRouter);
server.use('/api/historial', historialRouter);
server.use('/api/consulta', consultaRouter);
server.use('/api/reporte', reporteRouter);


// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
