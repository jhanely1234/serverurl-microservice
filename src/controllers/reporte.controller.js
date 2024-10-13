import { ReservaCita } from "../models/reserva.model.js";
import { User } from "../models/user.model.js";
import { Especialidades } from "../models/especialidad.model.js";
import { Role } from '../models/role.model.js';
import { Consulta } from '../models/consulta.model.js';
// Helper function to calculate growth percentage
const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getDashboardSummary = async (req, res) => {
  try {
    const totalAppointments = await ReservaCita.countDocuments();

    const pacienteRole = await Role.findOne({ name: "paciente" });
    if (!pacienteRole) {
      return res.status(404).json({ error: "Rol 'paciente' no encontrado" });
    }

    const newPatients = await User.countDocuments({ roles: { $in: [pacienteRole._id] } });

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const attendedAppointments = await ReservaCita.countDocuments({ estado_reserva: 'atendido' });
    const upcomingAppointments = await ReservaCita.countDocuments({ estado_reserva: 'pendiente' });

    const previousAttendedAppointments = await ReservaCita.countDocuments({
      estado_reserva: 'atendido',
      createdAt: { $lt: oneMonthAgo }
    });
    const previousUpcomingAppointments = await ReservaCita.countDocuments({
      estado_reserva: 'pendiente',
      createdAt: { $lt: oneMonthAgo }
    });

    const attendedAppointmentsGrowth = calculateGrowth(attendedAppointments, previousAttendedAppointments);
    const upcomingAppointmentsGrowth = calculateGrowth(upcomingAppointments, previousUpcomingAppointments);

    const previousTotalAppointments = await ReservaCita.countDocuments({
      createdAt: { $lt: oneMonthAgo }
    });
    const appointmentsGrowth = calculateGrowth(totalAppointments, previousTotalAppointments);

    const previousNewPatients = await User.countDocuments({
      roles: { $in: [pacienteRole._id] },
      createdAt: { $lt: oneMonthAgo }
    });
    const newPatientsGrowth = calculateGrowth(newPatients, previousNewPatients);

    res.json({
      totalAppointments,
      appointmentsGrowth,
      newPatients,
      newPatientsGrowth,
      attendedAppointments,
      attendedAppointmentsGrowth,
      upcomingAppointments,
      upcomingAppointmentsGrowth
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al obtener el resumen del dashboard' });
  }
};


export const getAppointmentsStats = async (req, res) => {
  const { period } = req.query;

  try {
    if (!['day', 'month', 'year'].includes(period)) {
      return res.status(400).json({ response: "error", message: 'el parámetro de período es inválido' });
    }

    const matchStage = { $match: {} };
    let groupStage;
    let sortStage;

    if (period === 'day') {
      groupStage = { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$fechaReserva" } }, total: { $sum: 1 } } };
      sortStage = { $sort: { "_id": 1 } };
    } else if (period === 'month') {
      groupStage = { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$fechaReserva" } }, total: { $sum: 1 } } };
      sortStage = { $sort: { "_id": 1 } };
    } else if (period === 'year') {
      groupStage = { $group: { _id: { $dateToString: { format: "%Y", date: "$fechaReserva" } }, total: { $sum: 1 } } };
      sortStage = { $sort: { "_id": 1 } };
    }

    const data = await ReservaCita.aggregate([matchStage, groupStage, sortStage]);

    res.json({ data: data.map(d => ({ name: d._id, total: d.total })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al obtener estadísticas de citas' });
  }
};


export const getAppointmentsStatusStats = async (req, res) => {
  const { period } = req.query;

  try {
    if (!['day', 'month', 'year'].includes(period)) {
      return res.status(400).json({ response: "error", message: 'el parámetro de período es inválido' });
    }

    let groupStage;
    let sortStage;

    if (period === 'day') {
      groupStage = {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$fechaReserva" } },
            estado: "$estado_reserva"
          },
          total: { $sum: 1 }
        }
      };
      sortStage = { $sort: { "_id.date": 1 } };
    } else if (period === 'month') {
      groupStage = {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m", date: "$fechaReserva" } },
            estado: "$estado_reserva"
          },
          total: { $sum: 1 }
        }
      };
      sortStage = { $sort: { "_id.date": 1 } };
    } else if (period === 'year') {
      groupStage = {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y", date: "$fechaReserva" } },
            estado: "$estado_reserva"
          },
          total: { $sum: 1 }
        }
      };
      sortStage = { $sort: { "_id.date": 1 } };
    }

    const data = await ReservaCita.aggregate([groupStage, sortStage]);

    const formattedData = data.reduce((acc, curr) => {
      const { date, estado } = curr._id;
      if (!acc[date]) {
        acc[date] = { date };
      }
      acc[date][estado] = curr.total;
      return acc;
    }, {});

    res.json({ data: Object.values(formattedData) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al obtener estadísticas de estados de citas' });
  }
};


export const getPatientsStats = async (req, res) => {
  const { period } = req.query;

  try {
    if (!['day', 'month', 'year'].includes(period)) {
      return res.status(400).json({ response: "error", message: 'el parámetro de período es inválido' });
    }

    const pacienteRole = await Role.findOne({ name: "paciente" });
    if (!pacienteRole) {
      return res.status(404).json({ error: "Rol 'paciente' no encontrado" });
    }

    const matchStage = { $match: { roles: { $in: [pacienteRole._id] } } };
    let groupStage;
    let sortStage;

    if (period === 'day') {
      groupStage = { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: 1 } } };
      sortStage = { $sort: { "_id": 1 } };
    } else if (period === 'month') {
      groupStage = { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, total: { $sum: 1 } } };
      sortStage = { $sort: { "_id": 1 } };
    } else if (period === 'year') {
      groupStage = { $group: { _id: { $dateToString: { format: "%Y", date: "$createdAt" } }, total: { $sum: 1 } } };
      sortStage = { $sort: { "_id": 1 } };
    }

    const data = await User.aggregate([matchStage, groupStage, sortStage]);

    res.json({ data: data.map(d => ({ name: d._id, total: d.total })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al obtener estadísticas de pacientes' });
  }
};


export const getSpecialtiesDistribution = async (req, res) => {
  try {
    const data = await ReservaCita.aggregate([
      { $group: { _id: "$especialidad_solicitada", value: { $sum: 1 } } },
      { $lookup: { from: "especialidades", localField: "_id", foreignField: "_id", as: "especialidad" } },
      { $unwind: "$especialidad" },
      { $project: { _id: 0, name: "$especialidad.name", value: 1 } }
    ]);

    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al obtener distribución de especialidades' });
  }
};


export const getUpcomingAppointments = async (req, res) => {
  try {
    const today = new Date();

    const appointments = await ReservaCita.find({ fechaReserva: { $gte: today } })
      .populate('paciente', 'name lastname')
      .populate('especialidad_solicitada', 'name')
      .select('fechaReserva horaInicio especialidad_solicitada paciente')
      .sort('fechaReserva')
      .exec();

    if (!appointments.length) {
      return res.status(404).json({ message: 'No hay citas próximas disponibles' });
    }

    res.json({
      appointments: appointments.map(appt => ({
        name: `${appt.paciente.name} ${appt.paciente.lastname}`,
        date: appt.fechaReserva.toISOString().split('T')[0],
        time: appt.horaInicio,
        specialty: appt.especialidad_solicitada.name
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error  al obtener próximas citas' });
  }
};


export const getReingresoRate = async (req, res) => {
  const { period } = req.query;

  try {
    if (!['day', 'month', 'year'].includes(period)) {
      return res.status(400).json({ response: "error", message: 'el parámetro de período es inválido' });
    }

    let startDate;
    const today = new Date();

    if (period === 'day') {
      startDate = new Date(today.setDate(today.getDate() - 1));
    } else if (period === 'month') {
      startDate = new Date(today.setMonth(today.getMonth() - 1));
    } else if (period === 'year') {
      startDate = new Date(today.setFullYear(today.getFullYear() - 1));
    }

    const reingresos = await ReservaCita.aggregate([
      { $match: { fechaReserva: { $gte: startDate } } },
      {
        $group: {
          _id: "$paciente",
          numConsultas: { $sum: 1 },
          lastVisit: { $max: "$fechaReserva" },
        },
      },
      { $match: { numConsultas: { $gt: 1 }, lastVisit: { $gte: startDate } } },
      { $sort: { "lastVisit": 1 } }
    ]);

    const totalPatients = await User.countDocuments();
    const reingresoRate = (reingresos.length / totalPatients) * 100;

    res.json({
      reingresoRate,
      reingresos: reingresos.length,
      totalPatients
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'al obtener la tasa de reingreso de pacientes' });
  }
};


export const getConsultationReport = async (req, res) => {
  try {
    const { startDate, endDate, estado, medicoId, pacienteId, especialidadId } = req.query;

    // Verificar fechas requeridas
    if (!startDate || !endDate) {
      return res.status(400).json({ response: "error", message: 'Se requieren startDate y endDate' });
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    if (start > end) {
      return res.status(400).json({ response: "error", message: 'El endDate no puede ser menor que el startDate.' });
    }

    // Filtro básico por fechas
    const consultaFilter = { fechaHora: { $gte: start, $lte: end } };

    // Filtros adicionales opcionales
    if (estado) {
      consultaFilter['citaMedica.estado_reserva'] = estado;
    }
    if (medicoId) {
      consultaFilter['citaMedica.medico'] = medicoId;
    }
    if (pacienteId) {
      consultaFilter['citaMedica.paciente'] = pacienteId;
    }
    if (especialidadId) {
      consultaFilter['citaMedica.especialidad_solicitada'] = especialidadId;
    }

    const consultas = await Consulta.find(consultaFilter)
      .populate({
        path: 'citaMedica',
        populate: { path: 'paciente medico especialidad_solicitada', select: 'name lastname' }
      })
      .exec();

    const totalConsultas = consultas.length;

    if (totalConsultas === 0) {
      return res.status(400).json({ response: "error", message: 'No hay datos para los filtros especificados.' });
    }

    const consultasAtendidas = consultas.filter(consulta => consulta.citaMedica.estado_reserva === 'atendido').length;
    const consultasPendientes = consultas.filter(consulta => consulta.citaMedica.estado_reserva === 'pendiente').length;
    const consultasCanceladas = consultas.filter(consulta => consulta.citaMedica.estado_reserva === 'cancelado').length;

    const reportData = consultas.map(consulta => ({
      paciente: {
        nombreCompleto: `${consulta.citaMedica.paciente.name} ${consulta.citaMedica.paciente.lastname}`,
      },
      consulta: {
        fechaConsulta: consulta.fechaHora,
        motivoConsulta: consulta.motivo_consulta,
        signosVitales: consulta.signos_vitales,
        diagnostico: consulta.diagnostico,
        receta: consulta.receta
      },
      medico: {
        nombreCompleto: `${consulta.citaMedica.medico.name} ${consulta.citaMedica.medico.lastname}`,
      }
    }));

    res.json({
      data: reportData,
      totals: {
        totalConsultas,
        consultasAtendidas,
        consultasPendientes,
        consultasCanceladas
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'Error al generar el reporte de consultas' });
  }
};



export const getReservationReport = async (req, res) => {
  try {
    const { startDate, endDate, estado, medicoId, pacienteId, especialidadId } = req.query;

    // Verificar fechas requeridas
    if (!startDate || !endDate) {
      return res.status(400).json({ response: "error", message: 'Se requieren startDate y endDate' });
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    if (start > end) {
      return res.status(400).json({ response: "error", message: 'endDate no puede ser menor que el startDate.' });
    }

    const reservaFilter = { fechaReserva: { $gte: start, $lte: end } };

    // Filtros adicionales opcionales
    if (estado) {
      reservaFilter['estado_reserva'] = estado;
    }
    if (medicoId) {
      reservaFilter['medico'] = medicoId;
    }
    if (pacienteId) {
      reservaFilter['paciente'] = pacienteId;
    }
    if (especialidadId) {
      reservaFilter['especialidad_solicitada'] = especialidadId;
    }

    const reservas = await ReservaCita.find(reservaFilter)
      .populate('paciente', 'name lastname ci fechaNacimiento telefono sexo')
      .populate('medico', 'name lastname especialidades')
      .populate('especialidad_solicitada', 'name')
      .exec();

    const totalReservas = reservas.length;

    if (totalReservas === 0) {
      return res.status(400).json({ response: "error", message: 'no hay datos para los filtros especificados.' });
    }

    const reservasAtendidas = reservas.filter(reserva => reserva.estado_reserva === 'atendido').length;
    const reservasPendientes = reservas.filter(reserva => reserva.estado_reserva === 'pendiente').length;
    const reservasCanceladas = reservas.filter(reserva => reserva.estado_reserva === 'cancelado').length;

    const reportData = reservas.map(reserva => ({
      paciente: {
        nombreCompleto: `${reserva.paciente.name} ${reserva.paciente.lastname}`,
        ci: reserva.paciente.ci,
      },
      reserva: {
        fechaReserva: reserva.fechaReserva,
        horaInicio: reserva.horaInicio,
        horaFin: reserva.horaFin,
        estado: reserva.estado_reserva
      },
      medico: {
        nombreCompleto: `${reserva.medico.name} ${reserva.medico.lastname}`,
        especialidad: reserva.especialidad_solicitada.name
      }
    }));

    res.json({
      data: reportData,
      totals: {
        totalReservas,
        reservasAtendidas,
        reservasPendientes,
        reservasCanceladas
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al generar el reporte de reservas' });
  }
};



export const getPatientReport = async (req, res) => {
  try {
    const { patientId, startDate, endDate, estado, especialidadId } = req.query;

    // Verificar fechas requeridas y patientId
    if (!patientId || !startDate || !endDate) {
      return res.status(400).json({ response: "error", message: 'se requieren patientId, startDate y endDate' });
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    if (start > end) {
      return res.status(400).json({ response: "error", message: 'endDate no puede ser menor que el startDate.' });
    }

    const paciente = await User.findById(patientId).select('name lastname ci fechaNacimiento telefono sexo').exec();
    if (!paciente) {
      return res.status(404).json({ response: "error", message: 'paciente no encontrado' });
    }

    const reservaFilter = {
      paciente: patientId,
      fechaReserva: { $gte: start, $lte: end }
    };

    if (estado) {
      reservaFilter['estado_reserva'] = estado;
    }
    if (especialidadId) {
      reservaFilter['especialidad_solicitada'] = especialidadId;
    }

    const reservas = await ReservaCita.find(reservaFilter)
      .populate('especialidad_solicitada', 'name')
      .populate('medico', 'name lastname')
      .exec();

    const consultas = await Consulta.find({
      citaMedica: { $in: reservas.map(reserva => reserva._id) }
    })
      .populate({
        path: 'citaMedica',
        populate: { path: 'medico', select: 'name lastname' }
      })
      .exec();

    const totalReservas = reservas.length;
    const totalConsultas = consultas.length;

    if (totalReservas === 0 && totalConsultas === 0) {
      return res.status(400).json({ response: "error", message: 'no hay datos para los filtros especificados.' });
    }

    const reservasAtendidas = reservas.filter(reserva => reserva.estado_reserva === 'atendido').length;
    const reservasPendientes = reservas.filter(reserva => reserva.estado_reserva === 'pendiente').length;
    const reservasCanceladas = reservas.filter(reserva => reserva.estado_reserva === 'cancelado').length;

    const reportData = {
      paciente: {
        nombreCompleto: `${paciente.name} ${paciente.lastname}`,
        ci: paciente.ci,
        fechaNacimiento: paciente.fechaNacimiento,
      },
      reservas: reservas.map(reserva => ({
        fechaReserva: reserva.fechaReserva,
        horaInicio: reserva.horaInicio,
        especialidad: reserva.especialidad_solicitada.name,
        estado: reserva.estado_reserva,
        medico: `${reserva.medico.name} ${reserva.medico.lastname}`
      })),
      consultas: consultas.map(consulta => ({
        fechaConsulta: consulta.fechaHora,
        motivoConsulta: consulta.motivo_consulta,
        diagnostico: consulta.diagnostico,
        receta: consulta.receta,
        medico: `${consulta.citaMedica.medico.name} ${consulta.citaMedica.medico.lastname}`
      })),
      totals: {
        totalReservas,
        reservasAtendidas,
        reservasPendientes,
        reservasCanceladas,
        totalConsultas
      }
    };

    res.json({ data: reportData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al generar el reporte del paciente' });
  }
};


export const getDoctorReport = async (req, res) => {
  try {
    const { doctorId, startDate, endDate, estado, especialidadId } = req.query;

    if (!doctorId || !startDate || !endDate) {
      return res.status(400).json({ response: "error", message: 'se requieren doctorId, startDate y endDate' });
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    if (start > end) {
      return res.status(400).json({ response: "error", message: 'endDate no puede ser menor que el startDate.' });
    }

    const medico = await User.findById(doctorId)
      .select('name lastname especialidades turno')
      .populate('especialidades', 'name')
      .exec();
    if (!medico) {
      return res.status(404).json({ response: "error", message: 'medico no encontrado' });
    }

    const reservaFilter = {
      medico: doctorId,
      fechaReserva: { $gte: start, $lte: end }
    };

    if (estado) {
      reservaFilter['estado_reserva'] = estado;
    }
    if (especialidadId) {
      reservaFilter['especialidad_solicitada'] = especialidadId;
    }

    const reservas = await ReservaCita.find(reservaFilter)
      .populate('paciente', 'name lastname')
      .populate('especialidad_solicitada', 'name')
      .exec();

    const consultas = await Consulta.find({
      citaMedica: { $in: reservas.map(reserva => reserva._id) }
    })
      .populate({
        path: 'citaMedica',
        populate: { path: 'paciente', select: 'name lastname' }
      })
      .exec();

    const totalReservas = reservas.length;
    const totalConsultas = consultas.length;

    if (totalReservas === 0 && totalConsultas === 0) {
      return res.status(400).json({ response: "error", message: 'no hay datos para los filtros especificados.' });
    }

    const reservasAtendidas = reservas.filter(reserva => reserva.estado_reserva === 'atendido').length;
    const reservasPendientes = reservas.filter(reserva => reserva.estado_reserva === 'pendiente').length;
    const reservasCanceladas = reservas.filter(reserva => reserva.estado_reserva === 'cancelado').length;

    const reportData = {
      medico: {
        nombreCompleto: `${medico.name} ${medico.lastname}`,
        especialidades: medico.especialidades.map(esp => esp.name).join(', '),
        turno: medico.turno || 'No especificado'
      },
      reservas: reservas.map(reserva => ({
        fechaReserva: reserva.fechaReserva,
        horaInicio: reserva.horaInicio,
        especialidad: reserva.especialidad_solicitada.name,
        estado: reserva.estado_reserva,
        paciente: `${reserva.paciente.name} ${reserva.paciente.lastname}`
      })),
      consultas: consultas.map(consulta => ({
        fechaConsulta: consulta.fechaHora,
        motivoConsulta: consulta.motivo_consulta,
        diagnostico: consulta.diagnostico,
        receta: consulta.receta,
        paciente: `${consulta.citaMedica.paciente.name} ${consulta.citaMedica.paciente.lastname}`
      })),
      totals: {
        totalReservas,
        reservasAtendidas,
        reservasPendientes,
        reservasCanceladas,
        totalConsultas
      }
    };

    res.json({ data: reportData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "error", message: 'error al generar el reporte del médico' });
  }
};
