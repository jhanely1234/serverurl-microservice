import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import { Especialidades } from "../models/especialidad.model.js";
import { Disponibilidad } from "../models/disponibilidad.model.js";
import mongoose from "mongoose";
import { validateEmail } from "../helpers/validator.helper.js";
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toDate, toZonedTime } from 'date-fns-tz';
import { ReservaCita } from "../models/reserva.model.js";


// Registrar un nuevo médico
export const registerMedico = async (req, res) => {
  const {
    name,
    email,
    password,
    ci,
    genero,
    fechaNacimiento,
    telefono,
    lastname,
    disponibilidad,
    especialidades,
    roles,
    turno
  } = req.body;

  // Validación del formato de email
  if (!validateEmail(email)) {
    return res.status(400).json({
      response: "error",
      message: "El formato del email no es válido"
    });
  }

  // Validación de campos obligatorios
  if (
    !name ||
    !email ||
    !password ||
    !ci ||
    !genero ||
    !fechaNacimiento ||
    !lastname ||
    !especialidades ||
    !telefono
  ) {
    return res.status(400).json({
      response: "error",
      message: "Todos los campos son obligatorios"
    });
  }

  // Obtener las especialidades enviadas para validación
  const especialidadDocuments = await Especialidades.find({
    _id: { $in: especialidades }
  });

  if (especialidadDocuments.length !== especialidades.length) {
    return res.status(400).json({
      response: "error",
      message: "Una o más especialidades no existen."
    });
  }

  // Buscar si alguna especialidad es "Medicina General"
  const especialidadMedicinaGeneral = especialidadDocuments.find(
    (especialidad) =>
      especialidad.name.toLowerCase().includes("medicina general")
  );

  // Si se selecciona "Medicina General", el turno es obligatorio
  if (especialidadMedicinaGeneral && !turno) {
    return res.status(400).json({
      response: "error",
      message: "Si se selecciona Medicina General, el turno es obligatorio."
    });
  }

  // Validar turno solo si se selecciona "Medicina General"
  if (especialidadMedicinaGeneral) {
    const turnosPermitidos = ["mañana", "tarde", "ambos"];
    if (!turnosPermitidos.includes(turno.toLowerCase())) {
      return res.status(400).json({
        response: "error",
        message: "El turno enviado no es válido. Solo se permiten los turnos: mañana, tarde, ambos."
      });
    }

    // Nueva validación: si el turno es "ambos", no se permite agregar más de una especialidad
    if (turno.toLowerCase() === "ambos" && especialidades.length > 1) {
      return res.status(400).json({
        response: "error",
        message: "Si se selecciona Medicina General con turno 'ambos', no se pueden agregar otras especialidades."
      });
    }
  }

  // Calcular edad del médico
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }

  // Nueva validación: Verificar que el médico tenga al menos 18 años
  if (edad < 18) {
    return res.status(400).json({
      response: "error",
      message: "El médico debe tener al menos 18 años."
    });
  }

  let defaultRoles = [];
  if (!roles || roles.length === 0) {
    const defaultRole = await Role.findOne({ name: "medico" });
    if (defaultRole) {
      defaultRoles = [defaultRole._id];
    }
  }

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { ci }] });
    if (existingUser) {
      let field = existingUser.email === email ? "email" : "CI";
      return res.status(400).json({
        response: "error",
        message: `El ${field} ya se encuentra registrado en la base de datos.`
      });
    }

    const roleDocuments = await Role.find({
      _id: { $in: roles || defaultRoles }
    });

    let dias = [];
    let horarios = [];

    // Asignar horarios automáticos si solo se selecciona Medicina General
    if (especialidadMedicinaGeneral) {
      dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

      if (turno.toLowerCase() === "mañana" || turno.toLowerCase() === "ambos") {
        dias.forEach((dia) => {
          horarios.push({
            dia,
            inicio: "08:00",
            fin: "12:00",
            turno: "mañana",
            especialidad: especialidadMedicinaGeneral._id
          });
        });
      }

      if (turno.toLowerCase() === "tarde" || turno.toLowerCase() === "ambos") {
        dias.forEach((dia) => {
          horarios.push({
            dia,
            inicio: "12:00",
            fin: "18:00",
            turno: "tarde",
            especialidad: especialidadMedicinaGeneral._id
          });
        });
      }
    }

    // Verificar si hay más de una especialidad, además de Medicina General
    const especialidadesSinMedicinaGeneral = especialidadDocuments.filter(
      (especialidad) =>
        !especialidad.name.toLowerCase().includes("medicina general")
    );

    if (especialidadesSinMedicinaGeneral.length > 0 && (!disponibilidad || disponibilidad.length === 0)) {
      return res.status(400).json({
        response: "error",
        message: "Debe proporcionar disponibilidad para todas las especialidades adicionales a Medicina General."
      });
    }

    // Validación de disponibilidad manual solo para otras especialidades
    if (especialidadesSinMedicinaGeneral.length > 0 && disponibilidad) {
      for (const dispo of disponibilidad) {
        if (dispo.inicio >= dispo.fin) {
          const especialidadError = especialidadDocuments.find(
            (especialidad) =>
              especialidad._id.toString() === dispo.especialidad.toString()
          );
          return res.status(400).json({
            response: "error",
            message: `La hora de inicio (${dispo.inicio}) no puede ser mayor o igual que la hora de fin (${dispo.fin}) para el día ${dispo.dia} en la especialidad ${especialidadError.name}.`
          });
        }

        if (dispo.inicio >= "08:00" && dispo.fin <= "12:00") {
          dispo.turno = "mañana";
        } else if (dispo.inicio >= "12:00" && dispo.fin <= "18:00") {
          dispo.turno = "tarde";
        } else if (dispo.inicio >= "08:00" && dispo.fin <= "18:00") {
          if (dispo.inicio < "12:00" && dispo.fin <= "12:00") {
            dispo.turno = "mañana";
          } else if (dispo.inicio >= "12:00") {
            dispo.turno = "tarde";
          } else {
            return res.status(400).json({
              response: "error",
              message: `El rango de horas para el día ${dispo.dia} no coincide completamente con los turnos permitidos (08:00-12:00 para mañana, 12:00-18:00 para tarde).`
            });
          }
        } else {
          return res.status(400).json({
            response: "error",
            message: `El rango de horas para el día ${dispo.dia} no coincide con los turnos permitidos (08:00-12:00 para mañana, 12:00-18:00 para tarde).`
          });
        }

        const conflictos = horarios.filter(
          (horario) =>
            horario.dia === dispo.dia &&
            ((horario.inicio < dispo.fin && horario.fin > dispo.inicio) ||
              (dispo.inicio < horario.fin && dispo.fin > horario.inicio))
        );

        if (conflictos.length > 0) {
          const nombresEspecialidadesConflicto = conflictos.map((conflict) => {
            const conflictEspecialidad = especialidadDocuments.find(
              (especialidad) =>
                especialidad._id.toString() === conflict.especialidad.toString()
            );
            return conflictEspecialidad.name;
          });

          return res.status(400).json({
            response: "error",
            message: `Conflicto de disponibilidad el ${dispo.dia} de ${dispo.inicio} a ${dispo.fin}. Debes cambiar los horarios de las siguientes especialidades: ${nombresEspecialidadesConflicto.join(", ")}.`
          });
        }

        horarios.push({
          ...dispo,
          especialidad: dispo.especialidad
        });
      }
    }

    // Crear el usuario médico
    const user = new User({
      name,
      lastname,
      email,
      password,
      roles: roleDocuments.map((role) => role._id),
      ci,
      genero,
      fechaNacimiento,
      edad,
      telefono,
      especialidades
    });

    const savedUser = await user.save();

    // Guardar las disponibilidades en el modelo de Disponibilidad
    for (const horario of horarios) {
      const nuevaDisponibilidad = new Disponibilidad({
        medico: savedUser._id,
        dia: horario.dia,
        inicio: horario.inicio,
        fin: horario.fin,
        turno: horario.turno,
        especialidad: horario.especialidad
      });
      await nuevaDisponibilidad.save();
    }

    const userResponse = {
      _id: savedUser._id,
      name,
      lastname,
      roles: roleDocuments.map((role) => role.name),
      edad,
      ci,
      genero,
      fechaNacimiento,
      email,
      especialidades: especialidadDocuments.map((especialidad) => especialidad.name)
    };

    return res.status(201).json({
      response: "success",
      user: userResponse
    });
  } catch (error) {
    console.log(error);
    let message = "Error del servidor";
    if (error.code === 11000) {
      const duplicateKey = Object.keys(error.keyValue)[0];
      message = `El ${duplicateKey} ya se encuentra registrado en la base de datos.`;
    }
    return res.status(500).json({ response: "error", message });
  }
};


// Obtener todos los médicos con sus disponibilidades
export const getMedicos = async (req, res) => {
  try {
    // Buscar el rol de médico
    const rolMedico = await Role.findOne({ name: "medico" });
    if (!rolMedico) {
      return res.status(404).json({ response: "error", message: "Rol de médico no encontrado." });
    }

    // Buscar todos los usuarios que tienen el rol de médico
    const medicos = await User.find({ roles: rolMedico._id })
      .select("-password") // Excluir el campo de contraseña
      .populate("especialidades", "name") // Obtener los nombres de las especialidades
      .populate("roles", "name"); // Obtener los nombres de los roles

    if (medicos.length === 0) {
      return res.status(404).json({ response: "error", message: "No se encontraron médicos." });
    }

    // Para cada médico, buscar sus disponibilidades
    const medicosConDisponibilidad = await Promise.all(medicos.map(async (medico) => {
      const disponibilidades = await Disponibilidad.find({ medico: medico._id })
        .populate("especialidad", "name"); // Obtener el nombre de la especialidad en la disponibilidad

      return {
        _id: medico._id,
        name: medico.name,
        lastname: medico.lastname,
        email: medico.email,
        ci: medico.ci,
        genero: medico.genero,
        telefono: medico.telefono,
        fechaNacimiento: medico.fechaNacimiento,
        edad: medico.edad,
        especialidades: medico.especialidades.map((esp) => esp.name),
        disponibilidades: disponibilidades.map((disp) => ({
          dia: disp.dia,
          inicio: disp.inicio,
          fin: disp.fin,
          turno: disp.turno,
          especialidad: disp.especialidad.name
        })),
      };
    }));

    res.status(200).json({ response: "success", medicos: medicosConDisponibilidad });
  } catch (error) {
    console.error("Error al obtener médicos:", error);
    res.status(500).json({ response: "error", message: "Error del servidor al obtener los médicos." });
  }
};

// Obtener un médico por ID con sus disponibilidades
export const getMedicoById = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ response: "error", message: "ID de médico inválido." });
  }

  try {
    // Buscar el médico por ID
    const medico = await User.findById(id)
      .select("-password") // Excluir el campo de contraseña
      .populate("especialidades", "_id name") // Obtener los nombres de las especialidades
      .populate("roles", "name"); // Obtener los nombres de los roles

    if (!medico) {
      return res.status(404).json({ response: "error", message: "Médico no encontrado." });
    }

    // Buscar las disponibilidades del médico
    const disponibilidades = await Disponibilidad.find({ medico: medico._id })
      .populate("especialidad", " _id name"); // Obtener el nombre de la especialidad en la disponibilidad

    // Devolver la información del médico junto con sus disponibilidades
    res.status(200).json({
      response: "success",
      medico: {
        _id: medico._id,
        name: medico.name,
        lastname: medico.lastname,
        email: medico.email,
        ci: medico.ci,
        genero: medico.genero,
        telefono: medico.telefono,
        fechaNacimiento: medico.fechaNacimiento,
        edad: medico.edad,
        especialidades: medico.especialidades.map((esp) => ({
          _id: esp._id,
          name: esp.name
        })),
        disponibilidades: disponibilidades.map((disp) => ({
          dia: disp.dia,
          inicio: disp.inicio,
          fin: disp.fin,
          turno: disp.turno,
          especialidad: {
            _id: disp.especialidad._id,
            name: disp.especialidad.name
          }
        })),
      },
    });
  } catch (error) {
    console.error("Error al obtener el médico:", error);
    res.status(500).json({ response: "error", message: "Error del servidor al obtener el médico." });
  }
};

// Actualizar médico (solo email, password, teléfono y restricciones en especialidades, disponibilidad y turno)
export const updateMedico = async (req, res) => {
  const { id } = req.params;
  const { telefono, especialidades, disponibilidad, turno, email, password } = req.body;
  const { user } = req; // Usuario autenticado extraído del middleware

  console.log("Usuario autenticado:", user);

  // Verificación del usuario autenticado
  if (!user) {
    return res.status(403).json({
      response: "error",
      message: "No se encontró el usuario autenticado."
    });
  }

  // Extraer los nombres de los roles del usuario autenticado
  const userRoles = user.roles.map(role => role.name); // Obtener los nombres de los roles
  const isAdminOrReceptionist = userRoles.includes('admin') || userRoles.includes('recepcionista');

  try {
    // Verificar si el médico existe
    const medico = await User.findById(id);
    if (!medico) {
      return res.status(404).json({
        response: "error",
        message: "Médico no encontrado."
      });
    }

    // Actualización de teléfono, email y password (sin restricciones)
    if (telefono) {
      medico.telefono = telefono;
    }

    if (email) {
      // Validar si el nuevo email ya existe en otro usuario
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== medico._id.toString()) {
        return res.status(400).json({
          response: "error",
          message: "El email ya está registrado en otro usuario."
        });
      }
      medico.email = email;
    }

    if (password) {
      medico.password = password; // La encriptación ocurre automáticamente con el hook pre-save
    }

    // Aplicar restricciones SOLO si se intenta actualizar especialidades, disponibilidad o turno
    if (especialidades || disponibilidad || turno) {
      // Verificar si el usuario es admin o recepcionista
      if (!isAdminOrReceptionist) {
        const lastUpdatedAt = medico.updatedAt;
        const now = new Date();
        const differenceInDays = Math.floor((now - lastUpdatedAt) / (1000 * 60 * 60 * 24));

        if (differenceInDays < 15) {
          return res.status(400).json({
            response: "error",
            message: `Solo puede actualizar las especialidades, disponibilidad o turno cada 15 días. Faltan ${15 - differenceInDays} días para la próxima actualización.`
          });
        }

        // Verificar si el médico está dentro de las 48 horas de actualización permitidas
        const canUpdateWindowStart = new Date(lastUpdatedAt.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 días después de la última actualización
        const canUpdateWindowEnd = new Date(canUpdateWindowStart.getTime() + (48 * 60 * 60 * 1000)); // Ventana de 48 horas

        if (now < canUpdateWindowStart || now > canUpdateWindowEnd) {
          return res.status(400).json({
            response: "error",
            message: "Fuera de la ventana de actualización. Debe esperar 15 días más."
          });
        }
      }

      // Proceso de actualización de especialidades, disponibilidad y turno
      await Disponibilidad.deleteMany({ medico: id });
      medico.especialidades = [];

      // Validar especialidades enviadas
      if (!especialidades || especialidades.length === 0) {
        return res.status(400).json({
          response: "error",
          message: "Debe proporcionar al menos una especialidad."
        });
      }

      const especialidadDocuments = await Especialidades.find({
        _id: { $in: especialidades }
      });

      if (especialidadDocuments.length !== especialidades.length) {
        return res.status(400).json({
          response: "error",
          message: "Una o más especialidades no existen."
        });
      }

      const especialidadMedicinaGeneral = especialidadDocuments.find(
        (especialidad) =>
          especialidad.name.toLowerCase().includes("medicina general")
      );

      if (especialidadMedicinaGeneral && !turno) {
        return res.status(400).json({
          response: "error",
          message: "Si se selecciona Medicina General, el turno es obligatorio."
        });
      }

      const turnosPermitidos = ["mañana", "tarde", "ambos"];
      if (especialidadMedicinaGeneral && !turnosPermitidos.includes(turno.toLowerCase())) {
        return res.status(400).json({
          response: "error",
          message: "El turno enviado no es válido. Solo se permiten los turnos: mañana, tarde, ambos."
        });
      }

      if (turno.toLowerCase() === "ambos" && especialidades.length > 1) {
        return res.status(400).json({
          response: "error",
          message: "Si se selecciona Medicina General con turno 'ambos', no se pueden agregar otras especialidades."
        });
      }

      medico.especialidades = especialidades;

      let dias = [];
      let horarios = [];

      if (especialidadMedicinaGeneral) {
        dias = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

        if (turno.toLowerCase() === "mañana" || turno.toLowerCase() === "ambos") {
          dias.forEach((dia) => {
            horarios.push({
              dia,
              inicio: "08:00",
              fin: "12:00",
              turno: "mañana",
              especialidad: especialidadMedicinaGeneral._id
            });
          });
        }

        if (turno.toLowerCase() === "tarde" || turno.toLowerCase() === "ambos") {
          dias.forEach((dia) => {
            horarios.push({
              dia,
              inicio: "12:00",
              fin: "18:00",
              turno: "tarde",
              especialidad: especialidadMedicinaGeneral._id
            });
          });
        }
      }

      const especialidadesSinMedicinaGeneral = especialidadDocuments.filter(
        (especialidad) =>
          !especialidad.name.toLowerCase().includes("medicina general")
      );

      if (especialidadesSinMedicinaGeneral.length > 0 && (!disponibilidad || disponibilidad.length === 0)) {
        return res.status(400).json({
          response: "error",
          message: "Debe proporcionar disponibilidad para todas las especialidades adicionales a Medicina General."
        });
      }

      if (especialidadesSinMedicinaGeneral.length > 0 && disponibilidad) {
        for (const dispo of disponibilidad) {
          if (dispo.inicio >= dispo.fin) {
            const especialidadError = especialidadDocuments.find(
              (especialidad) =>
                especialidad._id.toString() === dispo.especialidad.toString()
            );
            return res.status(400).json({
              response: "error",
              message: `La hora de inicio (${dispo.inicio}) no puede ser mayor o igual que la hora de fin (${dispo.fin}) para el día ${dispo.dia} en la especialidad ${especialidadError.name}.`
            });
          }

          if (dispo.inicio >= "08:00" && dispo.fin <= "12:00") {
            dispo.turno = "mañana";
          } else if (dispo.inicio >= "12:00" && dispo.fin <= "18:00") {
            dispo.turno = "tarde";
          } else {
            return res.status(400).json({
              response: "error",
              message: `El rango de horas para el día ${dispo.dia} no coincide con los turnos permitidos (08:00-12:00 para mañana, 12:00-18:00 para tarde).`
            });
          }

          horarios.push({
            ...dispo,
            especialidad: dispo.especialidad
          });
        }
      }

      for (const horario of horarios) {
        const nuevaDisponibilidad = new Disponibilidad({
          medico: id,
          dia: horario.dia,
          inicio: horario.inicio,
          fin: horario.fin,
          turno: horario.turno,
          especialidad: horario.especialidad
        });
        await nuevaDisponibilidad.save();
      }
    }

    // Guardar el médico actualizado
    await medico.save();

    return res.status(200).json({
      response: "success",
      message: "Médico actualizado con éxito.",
      medico: {
        _id: medico._id,
        name: medico.name,
        lastname: medico.lastname,
        telefono: medico.telefono,
        email: medico.email,
        especialidades: medico.especialidades
      }
    });
  } catch (error) {
    console.error("Error al actualizar médico:", error);
    return res.status(500).json({
      response: "error",
      message: "Error del servidor al actualizar el médico."
    });
  }
};




// Eliminar médico
export const deleteMedico = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ response: "error", message: "ID de médico inválido." });
  }

  try {
    // Verificar si el médico tiene reservas de citas asociadas
    const hasReservas = await ReservaCita.exists({ medico: id });
    if (hasReservas) {
      return res.status(400).json({ response: "error", message: "No se puede eliminar el médico porque tiene reservas asociadas." });
    }

    // Eliminar médico
    const medicoEliminado = await User.findByIdAndDelete(id);
    if (!medicoEliminado) {
      return res.status(404).json({ response: "error", message: "Médico no encontrado." });
    }

    // Eliminar disponibilidades asociadas al médico
    await Disponibilidad.deleteMany({ medico: id });

    return res.status(200).json({
      response: "success",
      message: "Médico eliminado correctamente."
    });
  } catch (error) {
    console.error("Error al eliminar médico:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al eliminar el médico." });
  }
};

// Buscar medicos por especialidad
export const buscarMedicosPorEspecialidadId = async (req, res) => {
  const { especialidadId } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(especialidadId)) {
    return res.status(400).json({ response: "error", message: "ID de especialidad inválido." });
  }

  try {
    // Verificar si la especialidad existe
    const especialidad = await Especialidades.findById(especialidadId);

    if (!especialidad) {
      return res.status(404).json({ response: "error", message: "Especialidad no encontrada." });
    }

    // Buscar médicos que tengan la especialidad solicitada
    const medicos = await User.find({ especialidades: especialidadId }).populate('especialidades', 'name');

    if (medicos.length === 0) {
      return res.status(404).json({ response: "error", message: "No se encontraron médicos con esta especialidad." });
    }

    // Devolver los médicos que tienen la especialidad solicitada
    const resultado = medicos.map(medico => ({
      id: medico._id,
      nombre: medico.name + ' ' + medico.lastname, // Asegurarnos de incluir el nombre del médico
    }));

    return res.status(200).json({ response: "success", medicos: resultado });
  } catch (error) {
    console.error("Error al buscar médicos por especialidad:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al buscar médicos por especialidad." });
  }
};

export const buscarMedicosPorEspecialidadIdcompleto = async (req, res) => {
  const { especialidadId } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(especialidadId)) {
    return res.status(400).json({ response: "error", message: "ID de especialidad inválido." });
  }

  try {
    // Verificar si la especialidad existe
    const especialidad = await Especialidades.findById(especialidadId);

    if (!especialidad) {
      return res.status(404).json({ response: "error", message: "Especialidad no encontrada." });
    }

    // Buscar médicos que tengan la especialidad solicitada
    const medicos = await User.find({ especialidades: especialidadId })
      .populate('especialidades', 'name'); // Poblar nombres de especialidades

    if (medicos.length === 0) {
      return res.status(404).json({ response: "error", message: "No se encontraron médicos con esta especialidad." });
    }

    // Obtener disponibilidades para cada médico
    const resultado = await Promise.all(medicos.map(async (medico) => {
      // Aquí hacemos el populate para obtener también la información de la especialidad en cada disponibilidad
      const disponibilidades = await Disponibilidad.find({ medico: medico._id })
        .populate('especialidad', 'name') // Poblar el nombre de la especialidad
        .select('dia inicio fin turno especialidad'); // Seleccionar solo los campos necesarios de disponibilidad

      return {
        id: medico._id,
        nombre: medico.name + ' ' + medico.lastname,
        email: medico.email,
        telefono: medico.telefono,
        calificacion: medico.calificacion || "No calificado",
        especialidades: medico.especialidades.map(especialidad => especialidad.name),
        disponibilidades: disponibilidades.map(d => ({
          dia: d.dia,
          inicio: d.inicio,
          fin: d.fin,
          turno: d.turno,
          especialidad: d.especialidad.name // Incluir el nombre de la especialidad en la disponibilidad
        })),
      };
    }));

    return res.status(200).json({ response: "success", medicos: resultado });
  } catch (error) {
    console.error("Error al buscar médicos por especialidad:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al buscar médicos por especialidad." });
  }
};


// Función para verificar si un intervalo está ocupado
const verificarIntervaloOcupado = (intervalo, reservas) => {
  return reservas.some(reserva => {
    return (
      reserva.horaInicio === intervalo.inicio &&
      reserva.horaFin === intervalo.fin &&
      reserva.estado_reserva !== "cancelado" // Solo consideramos OCUPADO si no está "cancelado"
    );
  });
};

// Función para eliminar acentos de los días de la semana y convertirlos a minúsculas
const eliminarAcentos = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Función para generar intervalos de tiempo
const generarIntervalos = (inicio, fin, duracion) => {
  let slots = [];
  let [horaInicio, minutoInicio] = inicio.split(":").map(Number);
  let [horaFin, minutoFin] = fin.split(":").map(Number);

  while (horaInicio < horaFin || (horaInicio === horaFin && minutoInicio < minutoFin)) {
    let siguienteHora = horaInicio;
    let siguienteMinuto = minutoInicio + duracion;

    if (siguienteMinuto >= 60) {
      siguienteHora += 1;
      siguienteMinuto -= 60;
    }

    let horaInicioString = `${horaInicio.toString().padStart(2, "0")}:${minutoInicio.toString().padStart(2, "0")}`;
    let horaFinString = `${siguienteHora.toString().padStart(2, "0")}:${siguienteMinuto.toString().padStart(2, "0")}`;

    slots.push({ inicio: horaInicioString, fin: horaFinString });

    horaInicio = siguienteHora;
    minutoInicio = siguienteMinuto;
  }

  return slots;
};

// Función para generar los próximos 15 días laborales en base a la zona horaria "America/La_Paz"
const generarProximosDias = (diasDisponibles) => {
  const zonaHoraria = 'America/La_Paz';
  const hoy = toZonedTime(new Date(), zonaHoraria); // Convertir a la zona horaria específica
  const dias = [];

  for (let i = 0; i < 15; i++) {
    const fecha = addDays(hoy, i);
    const diaSemana = eliminarAcentos(format(fecha, 'EEEE', { locale: es })); // Obtener el día de la semana en español sin acentos y en minúsculas

    // Revisar si el día está en la disponibilidad del médico (ambos sin acentos y en minúsculas)
    if (diasDisponibles.map(eliminarAcentos).includes(diaSemana)) {
      dias.push(fecha);
    }
  }

  return dias;
};

// API para obtener los próximos 15 días de trabajo de un médico, con las reservas ocupadas o libres
export const getCalendarioMedicoPorEspecialidad = async (req, res) => {
  const { medicoId, especialidadId } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(medicoId) || !mongoose.Types.ObjectId.isValid(especialidadId)) {
    return res.status(400).json({ response: "error", message: "ID de médico o especialidad inválido." });
  }

  try {
    // Verificar que el médico tenga la especialidad solicitada
    const disponibilidades = await Disponibilidad.find({
      medico: medicoId,
      especialidad: especialidadId
    }).populate("especialidad", "name");

    if (disponibilidades.length === 0) {
      return res.status(404).json({
        response: "error",
        message: "El médico no tiene esta especialidad o no tiene disponibilidad para esta especialidad."
      });
    }

    // Objeto para agrupar los intervalos por fecha
    const calendarioAgrupado = {};

    for (const disponibilidad of disponibilidades) {
      // Duración de los intervalos: 20 minutos para Medicina General, 30 minutos para otras especialidades
      const duracion = eliminarAcentos(disponibilidad.especialidad.name).includes("medicina general") ? 20 : 30;

      // Generar los próximos 15 días que coinciden con el día de la semana de la disponibilidad
      const diasTrabajo = generarProximosDias([disponibilidad.dia]);

      for (const dia of diasTrabajo) {
        const intervalos = generarIntervalos(disponibilidad.inicio, disponibilidad.fin, duracion);

        // Obtener las reservas para ese día y médico
        const reservasDia = await ReservaCita.find({
          medico: medicoId,
          especialidad_solicitada: especialidadId,
          fechaReserva: format(dia, 'yyyy-MM-dd')
        });

        // Marcar los intervalos como ocupados o libres, teniendo en cuenta el estado de la reserva
        const intervalosConEstado = intervalos.map(intervalo => {
          const ocupado = verificarIntervaloOcupado(intervalo, reservasDia);
          return {
            ...intervalo,
            estado: ocupado ? "OCUPADO" : "LIBRE"
          };
        });

        const fechaString = format(dia, 'yyyy-MM-dd'); // Formato de la fecha YYYY-MM-DD

        // Si la fecha ya existe en el calendario, agregamos los nuevos intervalos
        if (calendarioAgrupado[fechaString]) {
          calendarioAgrupado[fechaString].intervalos.push(...intervalosConEstado);
        } else {
          // Si la fecha no existe, creamos una nueva entrada
          calendarioAgrupado[fechaString] = {
            fecha: fechaString,
            especialidad: disponibilidad.especialidad.name,
            intervalos: intervalosConEstado
          };
        }
      }
    }

    // Convertir el objeto agrupado en un array y ordenar por fecha
    const calendarioFinal = Object.values(calendarioAgrupado).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    res.status(200).json({ response: "success", calendario: calendarioFinal });
  } catch (error) {
    console.error("Error al generar el calendario:", error);
    return res.status(500).json({ response: "error", message: "Error del servidor al generar el calendario." });
  }
};


// Obtener las disponibilidades de un médico organizadas por especialidad
export const getDisponibilidadesOrganizadas = async (req, res) => {
  const { id } = req.params;

  // Validar que el ID proporcionado sea un ObjectId válido
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ response: "error", message: "ID de médico inválido." });
  }

  try {
    // Buscar al médico por ID
    const medico = await User.findById(id)
      .select("-password") // Excluir el campo de contraseña
      .populate("especialidades", "_id name") // Obtener las especialidades del médico
      .populate("roles", "name"); // Obtener los nombres de los roles

    if (!medico) {
      return res.status(404).json({ response: "error", message: "Médico no encontrado." });
    }

    // Buscar las disponibilidades del médico
    const disponibilidades = await Disponibilidad.find({ medico: medico._id })
      .populate("especialidad", "_id name"); // Obtener el _id y el nombre de la especialidad en la disponibilidad

    // Organizar las disponibilidades por especialidad
    const disponibilidadesOrganizadas = medico.especialidades.map((especialidad) => {
      // Filtrar las disponibilidades según la especialidad actual
      const disponibilidadPorEspecialidad = disponibilidades.filter((disp) =>
        disp.especialidad._id.equals(especialidad._id)
      );

      // Si la especialidad es "Medicina General", solo mostrar el turno
      if (especialidad.name.toLowerCase().includes("medicina general")) {
        const turnos = [...new Set(disponibilidadPorEspecialidad.map((disp) => disp.turno))]; // Obtener turnos únicos
        return {
          especialidad: {
            _id: especialidad._id,
            name: especialidad.name,
          },
          turno: turnos.length > 0 ? turnos.join(", ") : "Sin turno disponible", // Mostrar los turnos únicos
        };
      } else {
        // Para otras especialidades, mostrar los días, horas y turnos
        return {
          especialidad: {
            _id: especialidad._id,
            name: especialidad.name,
          },
          disponibilidades: disponibilidadPorEspecialidad.map((disp) => ({
            dia: disp.dia,
            inicio: disp.inicio,
            fin: disp.fin,
            turno: disp.turno,
          })),
        };
      }
    });

    // Devolver la respuesta organizada por especialidad
    res.status(200).json({
      response: "success",
      medico: {
        _id: medico._id,
        name: medico.name,
        lastname: medico.lastname,
        email: medico.email,
        ci: medico.ci,
        genero: medico.genero,
        telefono: medico.telefono,
        fechaNacimiento: medico.fechaNacimiento,
        edad: medico.edad,
        especialidades: disponibilidadesOrganizadas,
      },
    });
  } catch (error) {
    console.error("Error al obtener las disponibilidades del médico:", error);
    res.status(500).json({ response: "error", message: "Error del servidor al obtener las disponibilidades." });
  }
};