import { Consulta } from "../models/consulta.model.js";
import { ReservaCita } from "../models/reserva.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import { formatInTimeZone } from 'date-fns-tz';
import axios from "axios";

// Controlador para registrar una nueva consulta médica
export const registrarConsulta = async (req, res) => {
  const {
    citaMedica, // ID de la reserva médica (cita)
    motivo_consulta = "", // Opcional
    signos_vitales = [], // Puede estar vacío inicialmente
    examen_fisico = "", // Opcional
    diagnostico = "", // Opcional
    conducta = "", // Opcional
    receta = "", // Opcional

  } = req.body;

  // Validar que el ID de la cita sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(citaMedica)) {
    return res.status(400).json({
      response: "error",
      message: "ID de cita médica inválido.",
    });
  }

  try {
    // Verificar si la cita médica existe y está en estado pendiente
    const reserva = await ReservaCita.findById(citaMedica);
    if (!reserva) {
      return res.status(404).json({
        response: "error",
        message: "Cita médica no encontrada.",
      });
    }

    if (reserva.estado_reserva !== "pendiente") {
      return res.status(400).json({
        response: "error",
        message: "La cita médica ya fue atendida o está cancelada.",
      });
    }

    // Obtener la hora actual en la zona horaria de America/La_Paz
    const zonaHoraria = 'America/La_Paz';
    const horaInicio = formatInTimeZone(new Date(), zonaHoraria, 'HH:mm');

    // Crear una nueva consulta
    const nuevaConsulta = new Consulta({
      citaMedica,
      motivo_consulta,
      signos_vitales, // Puede estar vacío
      examen_fisico, // Puede estar vacío
      diagnostico, // Puede estar vacío
      conducta, // Puede estar vacío
      receta, // Puede estar vacío
      horaInicio, // La hora de inicio es la hora actual en la zona horaria especificada
      horaFin: "", // Inicialmente vacío
      calificacion: 0, // Se asigna 0 por defecto al crear la consulta
    });

    // Guardar la consulta en la base de datos
    await nuevaConsulta.save();

    // Cambiar el estado de la reserva médica a "atendido"
    reserva.estado_reserva = "atendido";
    reserva.consulta = nuevaConsulta._id; // Actualizamos la referencia a la consulta creada
    await reserva.save();

    return res.status(201).json({
      response: "success",
      message: "Consulta registrada exitosamente.",
      consulta: nuevaConsulta,
    });
  } catch (error) {
    console.error("Error al registrar la consulta médica:", error);
    return res.status(500).json({
      response: "error",
      message: "Error del servidor al registrar la consulta médica.",
    });
  }
};

// Obtener todas las consultas
export const obtenerTodasLasConsultas = async (req, res) => {
  try {
    const consultas = await Consulta.find().populate('citaMedica', 'paciente medico especialidad_solicitada fechaReserva horaInicio horaFin');
    res.status(200).json({
      response: "success",
      consultas
    });
  } catch (error) {
    console.error("Error al obtener las consultas:", error);
    res.status(500).json({
      response: "error",
      message: "Error del servidor al obtener las consultas."
    });
  }
};

// Obtener una consulta por ID
export const obtenerConsultaPorId = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ response: "error", message: "ID de consulta inválido." });
  }

  try {
    const consulta = await Consulta.findById(id).populate('citaMedica', 'paciente medico especialidad_solicitada fechaReserva horaInicio horaFin');
    if (!consulta) {
      return res.status(404).json({ response: "error", message: "Consulta no encontrada." });
    }

    res.status(200).json({
      response: "success",
      consulta
    });
  } catch (error) {
    console.error("Error al obtener la consulta:", error);
    res.status(500).json({
      response: "error",
      message: "Error del servidor al obtener la consulta."
    });
  }
};

// Controlador para actualizar una consulta médica existente
export const actualizarConsulta = async (req, res) => {
  const { consultaId } = req.params;
  const {
    motivo_consulta,
    signos_vitales,
    examen_fisico,
    diagnostico,
    conducta,
    receta
  } = req.body;

  // Validar que el ID de la consulta sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(consultaId)) {
    return res.status(400).json({
      response: "error",
      message: "ID de consulta inválido.",
    });
  }

  try {
    // Buscar la consulta existente
    const consultaExistente = await Consulta.findById(consultaId);
    if (!consultaExistente) {
      return res.status(404).json({
        response: "error",
        message: "Consulta médica no encontrada.",
      });
    }

    // No modificar el campo `citaMedica`
    if (motivo_consulta) consultaExistente.motivo_consulta = motivo_consulta;
    if (signos_vitales) consultaExistente.signos_vitales = signos_vitales;
    if (examen_fisico) consultaExistente.examen_fisico = examen_fisico;
    if (diagnostico) consultaExistente.diagnostico = diagnostico;
    if (conducta) consultaExistente.conducta = conducta;
    if (receta) consultaExistente.receta = receta;

    // Actualizar `horaFin` con la hora actual en la zona horaria "America/La_Paz"
    const horaFin = formatInTimeZone(new Date(), 'America/La_Paz', 'HH:mm');
    consultaExistente.horaFin = horaFin;

    // Guardar los cambios
    const consultaActualizada = await consultaExistente.save();

    return res.status(200).json({
      response: "success",
      message: "Consulta actualizada exitosamente.",
      consulta: consultaActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar la consulta médica:", error);
    return res.status(500).json({
      response: "error",
      message: "Error del servidor al actualizar la consulta médica.",
    });
  }
};

// Eliminar una consulta
export const eliminarConsulta = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ response: "error", message: "ID de consulta inválido." });
  }

  try {
    const consultaEliminada = await Consulta.findByIdAndDelete(id);

    if (!consultaEliminada) {
      return res.status(404).json({ response: "error", message: "Consulta no encontrada." });
    }

    res.status(200).json({
      response: "success",
      message: "Consulta eliminada exitosamente."
    });
  } catch (error) {
    console.error("Error al eliminar la consulta:", error);
    res.status(500).json({
      response: "error",
      message: "Error del servidor al eliminar la consulta."
    });
  }
};


// Endpoint para calificar a un médico al finalizar la consulta
export const calificarMedico = async (req, res) => {
  try {
    const { consultaId, calificacion } = req.body;

    // 1. Encontrar la consulta médica a partir del ID de la consulta
    const consulta = await Consulta.findById(consultaId).populate({
      path: 'citaMedica',
      populate: { path: 'medico', model: 'User' },
    });

    if (!consulta) {
      return res.status(404).json({ message: 'Consulta no encontrada' });
    }

    console.log('Consulta encontrada:', consulta);

    if (consulta.calificacion && consulta.calificacion > 0) {
      return res.status(400).json({ message: 'Esta consulta ya ha sido calificada' });
    }

    // 2. Verificar que la calificación esté en el rango permitido
    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ message: 'La calificación debe estar entre 1 y 5' });
    }

    // 3. Guardar la calificación en la consulta
    consulta.calificacion = calificacion;
    await consulta.save();

    console.log('Calificación guardada en la consulta:', calificacion);

    // 4. Obtener el ID del médico desde la cita médica
    const medicoId = consulta.citaMedica.medico._id;
    console.log('ID del médico:', medicoId);

    // 5. Buscar todas las consultas que tengan relación con las reservas de citas de este médico
    const reservasDelMedico = await ReservaCita.find({ medico: medicoId });
    const reservasIds = reservasDelMedico.map(reserva => reserva._id);

    console.log(`Reservas del médico con ID ${medicoId}:`, reservasIds);

    // 6. Buscar todas las consultas que correspondan a las reservas del médico
    const consultasMedico = await Consulta.find({
      citaMedica: { $in: reservasIds },
      calificacion: { $exists: true },
    });

    console.log(`Consultas del médico con ID ${medicoId}:`, consultasMedico);

    // 7. Filtrar las consultas con calificaciones válidas
    const calificacionesValidas = consultasMedico
      .filter(consulta => consulta.calificacion !== null && consulta.calificacion > 0)
      .map(consulta => consulta.calificacion);

    console.log('Calificaciones válidas:', calificacionesValidas);

    // 8. Calcular la suma de las calificaciones válidas
    const sumaCalificaciones = calificacionesValidas.reduce((acc, calificacion) => acc + calificacion, 0);
    console.log('Suma de calificaciones válidas:', sumaCalificaciones);

    // 9. Calcular el promedio de calificaciones y redondearlo a un decimal
    const promedioCalificacion =
      calificacionesValidas.length > 0 ? (sumaCalificaciones / calificacionesValidas.length).toFixed(1) : 0;


    // 10. Actualizar la calificación promedio del médico
    const medico = await User.findById(medicoId);
    if (!medico) {
      return res.status(404).json({ message: 'Médico no encontrado' });
    }

    medico.calificacion = promedioCalificacion;
    await medico.save();

    console.log('Calificación promedio guardada en el médico:', medico.calificacion);

    // 11. Responder con éxito
    return res.status(200).json({
      message: 'Calificación registrada y promedio actualizado',
      calificacionPromedio: promedioCalificacion,
    });
  } catch (error) {
    console.error('Error al calificar al médico:', error);
    return res.status(500).json({ message: 'Error al calificar al médico' });
  }
};