import { User } from '../models/user.model.js';
import { Especialidades } from '../models/especialidad.model.js';
import { ReservaCita } from '../models/reserva.model.js';
import { Disponibilidad } from '../models/disponibilidad.model.js';
import mongoose from 'mongoose';
import axios from 'axios'; // Para hacer la llamada a la API de WhatsApp
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función para sumar minutos a una hora
const sumarMinutos = (hora, minutos) => {
  const [horaInt, minutosInt] = hora.split(':').map(Number);
  const nuevaHora = new Date();
  nuevaHora.setHours(horaInt);
  nuevaHora.setMinutes(minutosInt + minutos);
  const horaFin = nuevaHora.toTimeString().split(':').slice(0, 2).join(':');
  return horaFin;
};

// Función para verificar si la hora de inicio respeta los intervalos permitidos (20 o 30 minutos)
const esHoraValida = (horaInicio, duracion) => {
  const [_, minutosInicio] = horaInicio.split(':').map(Number);
  return minutosInicio % duracion === 0; // Verifica si los minutos son múltiplos de la duración
};

// Función para verificar si la hora de inicio permite que el fin esté dentro del rango disponible
const verificarHoraFinDentroRango = (horaInicio, duracion, horaFinDisponibilidad) => {
  const horaFinCalculada = sumarMinutos(horaInicio, duracion);
  return horaFinCalculada <= horaFinDisponibilidad; // Retorna true si la hora de fin calculada está dentro del rango permitido
};

// Función para enviar mensajes por WhatsApp usando la API de WhatsApp
const enviarMensajeWhatsApp = async (telefono, mensaje) => {
  try {
    const response = await axios.post(process.env.WHATSAPP_API_URL, {
      message: mensaje,
      phone: telefono
    });

    if (response.status === 200) {
      console.log(`Mensaje enviado exitosamente a ${telefono}`);
    } else {
      console.error(`Error al enviar el mensaje a ${telefono}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error al enviar el mensaje a ${telefono}:`, error.message);
  }
};

// Controlador para crear una reserva
export const registrarReserva = async (req, res) => {
  const {
    pacienteId,
    medicoId,
    especialidadId,
    fechaReserva,
    horaInicio,
  } = req.body;

  // Validar que los IDs proporcionados sean ObjectIds válidos
  if (!mongoose.Types.ObjectId.isValid(pacienteId) || !mongoose.Types.ObjectId.isValid(medicoId) || !mongoose.Types.ObjectId.isValid(especialidadId)) {
    return res.status(400).json({ response: "error", message: "ID de paciente, médico o especialidad inválido." });
  }

  try {
    // Verificar si el paciente existe
    const paciente = await User.findById(pacienteId);
    if (!paciente) {
      return res.status(404).json({ response: "error", message: "Paciente no encontrado." });
    }

    // Verificar si el médico existe y obtener sus especialidades y disponibilidad
    const medico = await User.findById(medicoId).populate('especialidades');
    if (!medico) {
      return res.status(404).json({ response: "error", message: "Médico no encontrado." });
    }

    // Verificar si el médico tiene la especialidad solicitada
    const tieneEspecialidad = medico.especialidades.some(especialidad => especialidad.equals(especialidadId));
    if (!tieneEspecialidad) {
      return res.status(400).json({ response: "error", message: "El médico no tiene la especialidad solicitada." });
    }

    // Obtener la disponibilidad del médico para la especialidad
    const disponibilidad = await Disponibilidad.findOne({ medico: medicoId, especialidad: especialidadId });
    if (!disponibilidad) {
      return res.status(400).json({ response: "error", message: "El médico no tiene disponibilidad para esta especialidad." });
    }

    // Determinar la duración del intervalo dependiendo de la especialidad
    const especialidad = await Especialidades.findById(especialidadId);
    const duracion = especialidad.name.toLowerCase().includes("medicina general") ? 20 : 30;

    // Validar que la hora de inicio esté alineada con los intervalos permitidos (20 minutos para medicina general, 30 para otras)
    if (!esHoraValida(horaInicio, duracion)) {
      return res.status(400).json({
        response: "error",
        message: `La hora de inicio debe estar alineada a los intervalos de ${duracion} minutos. Ejemplos válidos: 08:00, 08:20, 08:40, etc.`
      });
    }

    // Verificar que la hora de inicio permita que la hora de fin no exceda la disponibilidad del médico
    const horaFin = sumarMinutos(horaInicio, duracion);
    if (!verificarHoraFinDentroRango(horaInicio, duracion, disponibilidad.fin)) {
      return res.status(400).json({
        response: "error",
        message: `La hora de fin ${horaFin} excede la disponibilidad del médico, que es hasta ${disponibilidad.fin}.`
      });
    }

    // Verificar si el paciente ya tiene una reserva en la misma especialidad y fecha
    const fechaReservaDate = new Date(fechaReserva);
    const reservaMismaEspecialidad = await ReservaCita.findOne({
      paciente: pacienteId,
      especialidad_solicitada: especialidadId,
      fechaReserva: {
        $gte: new Date(fechaReservaDate.setHours(0, 0, 0, 0)),
        $lt: new Date(fechaReservaDate.setHours(23, 59, 59, 999))
      }
    });

    if (reservaMismaEspecialidad) {
      return res.status(400).json({
        response: "error",
        message: "Ya tienes una reserva en esta especialidad para el mismo día."
      });
    }

    // Verificar si el paciente ya tiene 3 reservas en el mismo día
    const reservasTotalesDia = await ReservaCita.countDocuments({
      paciente: pacienteId,
      fechaReserva: {
        $gte: new Date(fechaReservaDate.setHours(0, 0, 0, 0)),
        $lt: new Date(fechaReservaDate.setHours(23, 59, 59, 999))
      }
    });

    if (reservasTotalesDia >= 3) {
      return res.status(400).json({
        response: "error",
        message: "No puedes tener más de 3 reservas en un solo día."
      });
    }

    // Crear una nueva reserva
    const nuevaReserva = new ReservaCita({
      paciente: pacienteId,
      medico: medicoId,
      especialidad_solicitada: especialidadId,
      fechaReserva: new Date(fechaReserva),
      horaInicio,
      horaFin,
    });

    // Guardar la reserva en la base de datos
    await nuevaReserva.save();

    // Mensajes para paciente y médico
    const mensajePaciente = `👋👨‍⚕️ *Hola ${paciente.name} ${paciente.lastname}*,\n\n` +
      `📅 Tu reserva está registrada en el sistema y está pendiente de confirmación por parte del médico.\n\n` +
      `✅ Te notificaremos cuando el médico confirme tu cita.`;

    const mensajeMedico = `👋👨‍⚕️ *Hola Dr. ${medico.name} ${medico.lastname}*,\n\n` +
      `👤 Tiene una nueva reserva con el paciente *${paciente.name} ${paciente.lastname}* en la especialidad de *${especialidad.name}*.\n\n` +
      `✅ Fecha de la reserva: *${format(new Date(fechaReserva), "EEEE d 'de' MMMM", { locale: es })}*\n` +
      `✅ Horario: *${horaInicio} - ${horaFin}*.\n\n` +
      `✅ Por favor, confirme o cancele la cita en el sistema.`;

    // Enviar los mensajes por WhatsApp al paciente y al médico
    await enviarMensajeWhatsApp(paciente.telefono, mensajePaciente);
    await enviarMensajeWhatsApp(medico.telefono, mensajeMedico);

    return res.status(201).json({
      response: "success",
      message: "Reserva creada exitosamente, y los mensajes han sido enviados.",
      reserva: nuevaReserva
    });
  } catch (error) {
    console.error("Error al registrar la reserva:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al registrar la reserva." });
  }
};



// Obtener todas las citas
export const getCitas = async (req, res) => {
  try {
    const citas = await ReservaCita.find()
      .populate('paciente', 'name lastname')
      .populate('medico', 'name lastname')
      .populate('especialidad_solicitada', 'name')
      .populate({
        path: 'consulta', // Populate la consulta relacionada
        select: '_id calificacion', // Solo seleccionamos el ID y la calificación
      });

    if (citas.length === 0) {
      return res.status(404).json({ response: "error", message: "No se encontraron citas." });
    }

    return res.status(200).json({ response: "success", citas });
  } catch (error) {
    console.error("Error al obtener las citas:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al obtener las citas." });
  }
};


// Obtener una cita por su ID
export const getCitaById = async (req, res) => {
  const { citaId } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(citaId)) {
    return res.status(400).json({ response: "error", message: "ID de cita inválido." });
  }

  try {
    const cita = await ReservaCita.findById(citaId)
      .populate('paciente', 'name lastname')
      .populate('medico', 'name lastname')
      .populate('especialidad_solicitada', 'name')
      .populate({
        path: 'consulta', // Populate la consulta relacionada
        select: '_id calificacion', // Solo seleccionamos el ID y la calificación
      });

    if (!cita) {
      return res.status(404).json({ response: "error", message: "Cita no encontrada." });
    }

    return res.status(200).json({ response: "success", cita });
  } catch (error) {
    console.error("Error al obtener la cita:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al obtener la cita." });
  }
};


// Eliminar una cita (solo si el estado es "cancelado")
export const eliminarCita = async (req, res) => {
  const { citaId } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(citaId)) {
    return res.status(400).json({ response: "error", message: "ID de cita inválido." });
  }

  try {
    // Buscar la cita por su ID
    const cita = await ReservaCita.findById(citaId);

    if (!cita) {
      return res.status(404).json({ response: "error", message: "Cita no encontrada." });
    }

    // Verificar si el estado de la cita es "cancelado"
    if (cita.estado !== 'cancelado') {
      return res.status(400).json({
        response: "error",
        message: `No se puede eliminar la cita. El estado actual es: ${cita.estado}.`
      });
    }

    // Eliminar la cita
    await cita.remove(citaId);

    return res.status(200).json({
      response: "success",
      message: "Cita eliminada exitosamente."
    });
  } catch (error) {
    console.error("Error al eliminar la cita:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al eliminar la cita." });
  }
};



// Controlador para que el médico confirme o cancele la cita
export const confirmarOCancelarReserva = async (req, res) => {
  const { reservaId } = req.params;
  const { estadoConfirmacionMedico } = req.body;

  if (!['confirmado', 'cancelado'].includes(estadoConfirmacionMedico)) {
    return res.status(400).json({ response: "error", message: "El estado de confirmación debe ser 'confirmado' o 'cancelado'." });
  }

  try {
    // Verificar si la reserva existe
    const reserva = await ReservaCita.findById(reservaId)
      .populate('paciente', 'name lastname telefono')
      .populate('medico', 'name lastname telefono')
      .populate('especialidad_solicitada', 'name');

    if (!reserva) {
      return res.status(404).json({ response: "error", message: "Reserva no encontrada." });
    }

    // Actualizar el estado de confirmación del médico y del paciente
    reserva.estadoConfirmacionMedico = estadoConfirmacionMedico;

    if (estadoConfirmacionMedico === 'confirmado') {
      reserva.estadoConfirmacionPaciente = 'confirmado';

      // Mensaje para el médico
      const mensajeMedico = `👋👨‍⚕️ *Gracias Dr. ${reserva.medico.name} ${reserva.medico.lastname}*,\n\n` +
        `✅ Por confirmar tu reserva con el paciente *${reserva.paciente.name} ${reserva.paciente.lastname}* para la fecha *${format(new Date(reserva.fechaReserva), "EEEE d 'de' MMMM", { locale: es })}*.\n`;

      // Mensaje para el paciente
      const mensajePaciente = `👋👨‍⚕️ *Hola ${reserva.paciente.name} ${reserva.paciente.lastname}*,\n\n` +
        `📅 Tu reserva con el médico *${reserva.medico.name} ${reserva.medico.lastname}* en la especialidad de *${reserva.especialidad_solicitada.name}* ha sido confirmada.\n\n` +
        `⏰ Fecha de la cita: *${format(new Date(reserva.fechaReserva), "EEEE d 'de' MMMM", { locale: es })}*\n` +
        `✅ Horario: *${reserva.horaInicio} - ${reserva.horaFin}*\n\n` +
        `🔔 ¡Por favor, no faltes a tu cita!`;

      // Enviar los mensajes
      await enviarMensajeWhatsApp(reserva.paciente.telefono, mensajePaciente);
      await enviarMensajeWhatsApp(reserva.medico.telefono, mensajeMedico);

    } else if (estadoConfirmacionMedico === 'cancelado') {
      reserva.estadoConfirmacionPaciente = 'cancelado';
      reserva.estado_reserva = 'cancelado';

      // Mensaje para el paciente
      const mensajePaciente = `👋👨‍⚕️ *Hola ${reserva.paciente.name} ${reserva.paciente.lastname}*,\n\n` +
        `📅 Lamentamos informarte que tu reserva con el médico *${reserva.medico.name} ${reserva.medico.lastname}* en la especialidad de *${reserva.especialidad_solicitada.name}* ha sido cancelada.\n\n` +
        `🔔 Por favor, contacta con la administración para reprogramar tu cita.`;

      // Mensaje para el médico
      const mensajeMedico = `👋👨‍⚕️ *Hola Dr. ${reserva.medico.name} ${reserva.medico.lastname}*,\n\n` +
        `❌ Has cancelado la reserva con el paciente *${reserva.paciente.name} ${reserva.paciente.lastname}* programada para la fecha *${format(new Date(reserva.fechaReserva), "EEEE d 'de' MMMM", { locale: es })}*.\n`;

      // Enviar los mensajes
      await enviarMensajeWhatsApp(reserva.paciente.telefono, mensajePaciente);
      await enviarMensajeWhatsApp(reserva.medico.telefono, mensajeMedico);
    }

    // Guardar los cambios en la reserva
    await reserva.save();

    return res.status(200).json({
      response: "success",
      message: `La reserva ha sido ${estadoConfirmacionMedico}.`,
      reserva
    });

  } catch (error) {
    console.error("Error al confirmar o cancelar la reserva:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al confirmar o cancelar la reserva." });
  }
};