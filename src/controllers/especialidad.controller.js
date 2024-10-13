import { Especialidades } from "../models/especialidad.model.js";
import mongoose from "mongoose";

// Crear una nueva especialidad
// Función para limpiar y capitalizar el nombre
const cleanAndNormalizeName = (str) => {
    return str
        .normalize('NFD') // Descompone los caracteres con acento en caracteres base + marcas de acento
        .replace(/[\u0300-\u036f]/g, '') // Elimina las marcas de acento
        .replace(/[^\w\s]/g, '') // Elimina caracteres no alfanuméricos excepto los espacios
        .replace(/\s+/g, ' ') // Reemplaza múltiples espacios por un solo espacio
        .trim() // Elimina los espacios al inicio y al final
        .toLowerCase(); // Convierte todo a minúsculas
};

// Función para capitalizar la primera letra de cada palabra
const capitalizarletras = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const createEspecialidad = async (req, res) => {
    const { name } = req.body;

    // Validación de datos
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            status: "error",
            message: "El nombre de la especialidad es obligatorio y debe ser una cadena válida."
        });
    }

    try {
        // Limpiar y normalizar el nombre
        const normalizedName = capitalizarletras(cleanAndNormalizeName(name));

        // Verificar si ya existe una especialidad con el mismo nombre
        const existingEspecialidad = await Especialidades.findOne({ name: normalizedName });
        if (existingEspecialidad) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe una especialidad con este nombre."
            });
        }

        const especialidad = new Especialidades({ name: normalizedName });
        await especialidad.save();

        return res.status(201).json({
            status: "success",
            message: "Especialidad creada exitosamente",
            especialidad
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            message: "Error del servidor al crear la especialidad"
        });
    }
};

// Función para capitalizar el inicio de cada palabra
const capitalizeWords = (str) => {
    return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

// Obtener todas las especialidades
export const getEspecialidades = async (req, res) => {
    try {
        let especialidades = await Especialidades.find();

        if (!especialidades.length) {
            return res.status(404).json({
                status: "error",
                message: "No se encontraron especialidades."
            });
        }

        // Capitalizar el nombre de cada especialidad
        especialidades = especialidades.map(especialidad => ({
            ...especialidad.toObject(), // Convertir a objeto si es necesario
            name: capitalizeWords(especialidad.name)
        }));

        return res.status(200).json({
            status: "success",
            message: "Especialidades obtenidas correctamente",
            especialidades
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            message: "Error del servidor al obtener las especialidades"
        });
    }
};


// Obtener una especialidad por ID
export const getEspecialidad = async (req, res) => {
    const { id } = req.params;

    // Validar ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            status: "error",
            message: "ID de especialidad inválido."
        });
    }

    try {
        const especialidad = await Especialidades.findById(id);

        if (!especialidad) {
            return res.status(404).json({
                status: "error",
                message: "Especialidad no encontrada."
            });
        }

        // Capitalizar el nombre de la especialidad
        const especialidadFormatted = {
            ...especialidad.toObject(), // Convertir a objeto si es necesario
            name: capitalizeWords(especialidad.name)
        };

        return res.status(200).json({
            status: "success",
            message: "Especialidad obtenida correctamente",
            especialidad: especialidadFormatted
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            message: "Error del servidor al obtener la especialidad"
        });
    }
};


// Actualizar una especialidad
export const updateEspecialidad = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    // Validar ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            status: "error",
            message: "ID de especialidad inválido."
        });
    }

    // Validación de datos
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
            status: "error",
            message: "El nombre de la especialidad es obligatorio y debe ser una cadena válida."
        });
    }

    try {
        // Verificar si ya existe una especialidad con el mismo nombre
        const existingEspecialidad = await Especialidades.findOne({ name: name.trim(), _id: { $ne: id } });
        if (existingEspecialidad) {
            return res.status(400).json({
                status: "error",
                message: "Ya existe una especialidad con este nombre."
            });
        }

        const especialidad = await Especialidades.findByIdAndUpdate(id, { name: name.trim() }, { new: true });

        if (!especialidad) {
            return res.status(404).json({
                status: "error",
                message: "Especialidad no encontrada."
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Especialidad actualizada correctamente",
            especialidad
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            message: "Error del servidor al actualizar la especialidad"
        });
    }
};

// Eliminar una especialidad
export const deleteEspecialidad = async (req, res) => {
    const { id } = req.params;

    // Validar ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            status: "error",
            message: "ID de especialidad inválido."
        });
    }

    try {
        const especialidad = await Especialidades.findByIdAndDelete(id);

        if (!especialidad) {
            return res.status(404).json({
                status: "error",
                message: "Especialidad no encontrada."
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Especialidad eliminada correctamente",
            especialidad
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            status: "error",
            message: "Error del servidor al eliminar la especialidad"
        });
    }
};
