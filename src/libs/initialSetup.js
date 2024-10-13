import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { Especialidades } from "../models/especialidad.model.js"; // Asegúrate de que la ruta sea correcta

const ADMIN_EMAIL = 'admin@admin.com'; // Email del administrador
const ADMIN_USERNAME = 'Admin'; // Nombre de usuario del administrador
const ADMIN_LASTNAME = 'Principal'; // Apellido del administrador
const ADMIN_PASSWORD = 'admin123'; // Contraseña del administrador

const RECEPCIONISTA_EMAIL = 'recepcionista@recepcionista.com'; // Email del recepcionista
const RECEPCIONISTA_USERNAME = 'Recepcionista'; // Nombre de usuario del recepcionista
const RECEPCIONISTA_LASTNAME = 'Principal'; // Apellido del recepcionista
const RECEPCIONISTA_PASSWORD = 'recepcionista123'; // Contraseña del recepcionista

// Lista de especialidades predefinidas
const ESPECIALIDADES = [
  'Cardiologia',
  'Dermatologia',
  'Medicina General',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Pediatria',
  'Traumatologia'
];

export const createRoles = async () => {
  try {
    // Contar documentos
    const count = await Role.estimatedDocumentCount();

    // Si ya existen roles, no hacer nada
    if (count > 0) return;

    // Crear roles por defecto
    const values = await Promise.all([
      new Role({ name: "paciente" }).save(),
      new Role({ name: "medico" }).save(),
      new Role({ name: "admin" }).save(),
      new Role({ name: "recepcionista" }).save(),
    ]);

    console.log("Roles creados:", values);
  } catch (error) {
    console.error("Error al crear roles:", error);
  }
};

export const createAdmin = async () => {
  try {
    // Comprobar si ya existe un administrador
    const userFound = await User.findOne({ email: ADMIN_EMAIL });
    if (userFound) {
      console.log('Ya existe un usuario administrador registrado.');
      return;
    }

    // Obtener el rol de administrador
    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.error('No se encontró el rol de administrador en la base de datos.');
      return;
    }

    // Crear un nuevo usuario administrador
    const newUser = await User.create({
      name: ADMIN_USERNAME,
      lastname: ADMIN_LASTNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      roles: [adminRole._id],
    });

    console.log(`Nuevo usuario administrador creado: ${newUser.name} ${newUser.lastname}`);
  } catch (error) {
    console.error('Error al crear el usuario administrador:', error);
  }
};

export const createRecepcionista = async () => {
  try {
    // Comprobar si ya existe un recepcionista
    const userFound = await User.findOne({ email: RECEPCIONISTA_EMAIL });
    if (userFound) {
      console.log('Ya existe un usuario recepcionista registrado.');
      return;
    }

    // Obtener el rol de recepcionista
    const recepcionistaRole = await Role.findOne({ name: 'recepcionista' });
    if (!recepcionistaRole) {
      console.error('No se encontró el rol de recepcionista en la base de datos.');
      return;
    }

    // Crear un nuevo usuario recepcionista
    const newRecepcionista = await User.create({
      name: RECEPCIONISTA_USERNAME,
      lastname: RECEPCIONISTA_LASTNAME,
      email: RECEPCIONISTA_EMAIL,
      password: RECEPCIONISTA_PASSWORD,
      roles: [recepcionistaRole._id],
    });

    console.log(`Nuevo usuario recepcionista creado: ${newRecepcionista.name} ${newRecepcionista.lastname}`);
  } catch (error) {
    console.error('Error al crear el usuario recepcionista:', error);
  }
};

// Función para crear especialidades
export const createEspecialidades = async () => {
  try {
    // Contar el número de especialidades existentes
    const count = await Especialidades.estimatedDocumentCount();

    // Si ya hay especialidades, no hacer nada
    if (count > 0) return;

    // Crear especialidades por defecto
    const values = await Promise.all(
      ESPECIALIDADES.map((especialidad) =>
        new Especialidades({ name: especialidad }).save()
      )
    );

    console.log("Especialidades creadas:", values);
  } catch (error) {
    console.error("Error al crear especialidades:", error);
  }
};

// Función para inicializar todo
const initialize = async () => {
  await createRoles();
  await createAdmin();
  await createRecepcionista();
  await createEspecialidades(); // Añadido para crear especialidades
};

initialize();
