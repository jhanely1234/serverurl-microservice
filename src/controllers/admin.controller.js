import { User } from '../models/user.model.js';
import { Role } from '../models/role.model.js';
import { Especialidades } from '../models/especialidad.model.js';
import { generateJwt } from '../helpers/token.helper.js';
import { validateEmail } from '../helpers/validator.helper.js';
import mongoose from 'mongoose';

export const registerAdmin = async (req, res) => {
    const { name, email, password, ci, genero, fechaNacimiento, telefono, lastname, roles } = req.body;
    // Validar el formato del email usando validateEmail
    if (!validateEmail(email)) {
        return res.status(400).json({ response: 'error', message: 'El formato del email no es válido' });
    }
    // Validar otros campos obligatorios y lógica de negocio
    if (!name || !email || !password || !ci || !genero || !fechaNacimiento || !lastname || !telefono) {
        return res.status(400).json({ response: 'error', message: 'Todos los campos son obligatorios' });
    }

    // Calcular la edad a partir de la fecha de nacimiento
    const hoy = new Date();
    const fechaNac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
    }

    // Definir el rol por defecto como Aministrador si no se proporciona ninguno
    let defaultRoles = [];
    if (!roles || roles.length === 0) {
        const defaultRole = await Role.findOne({ name: 'admin' }); // 'admin' exista en tu colección de roles
        if (defaultRole) {
            defaultRoles = [defaultRole._id];
        }
    }

    try {

        const roleDocuments = await Role.find({ _id: { $in: roles || defaultRoles } });


        const user = new User({
            name,
            lastname,
            email,
            password,
            roles: roleDocuments.map(role => role._id),
            ci,
            genero,
            fechaNacimiento,
            edad,
            telefono,

        });

        const savedUser = await user.save();

        return res.status(201).json({
            response: 'success',
            user: {
                _id: savedUser._id,
                name,
                lastname,
                roles: roleDocuments.map(role => role.name),
                edad,
                password,
                ci,
                genero,
                fechaNacimiento,
                email,
            },
        });
    } catch (error) {
        console.log(error);
        let message = 'Error del servidor';
        if (error.code === 11000) {
            message = 'El usuario ya se encuentra registrado en la base de datos.';
        }
        return res.status(500).json({ response: 'error', message });
    }

};


export const getAdmins = async (req, res) => {
    try {
        const rolesToFind = await Role.find({ name: { $in: ['admin', 'recepcionista'] } });

        if (!rolesToFind || rolesToFind.length === 0) {
            return res.status(404).json({ response: 'error', message: 'No se encontraron los roles de admin o recepcionista' });
        }

        const roleIds = rolesToFind.map(role => role._id);

        const admins = await User.find({ roles: { $in: roleIds } })
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name -_id'
            })
            .exec();

        res.status(200).json(admins);
    } catch (error) {
        console.log(error);
        res.status(500).json({ response: 'error', message: 'Error del servidor al obtener los admins' });
    }
}

export const getAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        // Buscar un medico por su ID y populate para obtener los nombres de especialidades y roles
        const admin = await User.findById(id)
            .select('-password')

            .populate({
                path: 'roles',
                select: 'name -_id'
            })
            .exec();

        res.status(200).json(admin);
    } catch (error) {
        console.log(error);
        res.status(500).json({ response: 'error', message: 'Error del servidor al obtener el admin' });
    }
}

export const updateAdmin = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, lastname, ci, genero, fechaNacimiento, telefono } = req.body;
    try {
        const admin = await User.findByIdAndUpdate(id, { name, email, password, lastname, ci, genero, fechaNacimiento, telefono }, { new: true })
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name -_id'
            })
        res.status(200).json({ response: 'success', message: 'Admin Actualizado correctamente', admin });
    } catch (error) {
        console.log(error);
        res.status(500).json({ response: 'error', message: 'Error del servidor al actualizar el medico' });
    }
}

export const deleteAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        const admin = await User.findByIdAndDelete(id)
            .select('-password')
            .populate({
                path: 'roles',
                select: 'name -_id'
            });
        res.status(200).json({ response: 'success', message: 'admin eliminado correctamente' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ response: 'error', message: 'Error del servidor al eliminar el admin' });
    }
}