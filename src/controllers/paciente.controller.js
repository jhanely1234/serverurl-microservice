import { User } from "../models/user.model.js";
import { Role } from "../models/role.model.js";
import { generateJwt } from "../helpers/token.helper.js";
import { validateEmail } from "../helpers/validator.helper.js";
import { HistorialMedico } from "../models/historialMedico.model.js";
import mongoose from "mongoose";

import { ReservaCita } from "../models/reserva.model.js"; // Ajusta la ruta según tu estructura de archivos

// Crear nuevo usuario
export const createUser = async (req, res) => {
  const {
    name,
    lastname,
    email,
    password,
    roles,
    ci,
    genero,
    fechaNacimiento,
    telefono,
    telefono_tutor,
    nombre_tutor
  } = req.body;

  // Validar el formato del email usando validateEmail
  if (!validateEmail(email)) {
    return res.status(400).json({
      response: "error",
      message: "El formato del email no es válido"
    });
  }

  // Validar otros campos obligatorios y lógica de negocio
  if (!name || !lastname || !password) {
    return res.status(400).json({
      response: "error",
      message: "Todos los campos son obligatorios"
    });
  }

  // Calcular la edad a partir de la fecha de nacimiento
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }

  // Verificar si es menor de edad y se requiere información del tutor
  if (edad < 18 && (!telefono_tutor || !nombre_tutor)) {
    return res.status(400).json({
      response: "error",
      message:
        "Por favor, proporcione el nombre y teléfono de su tutor o apoderado"
    });
  }

  // Definir el rol por defecto como paciente si no se proporciona ninguno
  let defaultRoles = [];
  if (!roles || roles.length === 0) {
    const defaultRole = await Role.findOne({ name: "paciente" }); // Asegúrate que 'paciente' exista en tu colección de roles
    if (defaultRole) {
      defaultRoles = [defaultRole._id];
    }
  }

  try {
    // Verifica si el correo o el CI ya existen
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
      nombre_tutor,
      telefono_tutor
    });

    const savedUser = await user.save();
    const access_token = generateJwt(savedUser._id);

    // Crear el historial médico para el nuevo paciente si es un paciente
    if (roleDocuments.some((role) => role.name === "paciente")) {
      const newHistorialMedico = new HistorialMedico({
        paciente: savedUser._id,
        consultas: []
      });
      await newHistorialMedico.save();
    }

    return res.status(201).json({
      response: "success",
      user: {
        access_token,
        name,
        lastname,
        roles: roleDocuments.map((role) => role.name),
        edad,
        password,
        ci,
        genero,
        fechaNacimiento,
        email,
        nombre_tutor,
        telefono_tutor
      }
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

// Obtener el usuario de la sesión
export const getMe = async (req, res) => {
  const { user } = req;
  return res.status(200).json(user);
};

export const getPacientes = async (req, res) => {
  try {
    const rolepaciente = await Role.findOne({ name: "paciente" });

    if (!rolepaciente) {
      return res.status(404).json({
        response: "error",
        message: "No se encontró el rol de paciente"
      });
    }
    // Buscar todos los usuarios con rol 'paciente' y populate para obtener los nombres de especialidades y roles
    const pacientes = await User.find({ roles: { $in: [rolepaciente._id] } })
      .select("-password -especialidades")

      .populate({
        path: "roles",
        select: "name -_id"
      });
    res.status(200).json(pacientes);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      response: "error",
      message: "Error del servidor al obtener los usuarios"
    });
  }
};

export const getPaciente = async (req, res) => {
  const { id } = req.params;
  try {
    // Buscar un paciente por su ID y populate para obtener los nombres de especialidades y roles
    const paciente = await User.findById(id)
      .select("-password -especialidades")
      .populate({
        path: "roles",
        select: "name -_id"
      })
      .exec();

    res.status(200).json(paciente);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      response: "error",
      message: "Error del servidor al obtener el paciente"
    });
  }
};

export const deletePaciente = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el paciente tiene reservas
    const tieneReservas = await ReservaCita.exists({ paciente: id });

    // Verificar si el paciente tiene historial médico
    const tieneHistorial = await HistorialMedico.exists({ paciente: id });

    if (tieneReservas || tieneHistorial) {
      return res.status(400).json({
        response: "error",
        message:
          "El paciente no se puede eliminar porque tiene reservas o historial médico asociado."
      });
    }

    // Eliminar paciente si no tiene reservas ni historial médico
    const paciente = await User.findByIdAndDelete(id)
      .select("-password")
      .populate({
        path: "roles",
        select: "name -_id"
      });

    if (!paciente) {
      return res.status(404).json({
        response: "error",
        message: "Paciente no encontrado"
      });
    }

    res.status(200).json({
      response: "success",
      message: "Paciente eliminado correctamente"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      response: "error",
      message: "Error del servidor al eliminar el paciente"
    });
  }
};

export const updatePaciente = async (req, res) => {
  const { id } = req.params;
  const { telefono, password, email } = req.body;

  // Validar que se haya enviado al menos uno de los campos (telefono o password)
  if (!telefono && !password && !email) {
    return res.status(400).json({
      response: "error",
      message: "Debe proporcionar al menos un campo: email, teléfono o contraseña."
    });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        response: "error",
        message: "Usuario no encontrado"
      });
    }

    // Si se proporciona un nuevo teléfono, actualizarlo
    if (telefono) {
      user.telefono = telefono;
    }
    // Si se proporciona un nuevo email, actualizarlo
    if (email) {
      user.email = email;
    }

    // Si se proporciona una nueva contraseña, actualizarla (Mongoose se encargará de la encriptación)
    if (password) {
      user.password = password; // La encriptación ocurre automáticamente en el pre-save hook
    }

    // Guardar los cambios
    const updatedUser = await user.save();

    return res.status(200).json({
      response: "success",
      user: {
        id: updatedUser._id,
        telefono: updatedUser.telefono,
        // No devolver la contraseña en la respuesta por seguridad
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      response: "error",
      message: "Error del servidor al actualizar el usuario"
    });
  }
};
