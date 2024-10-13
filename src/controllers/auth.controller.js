import { User } from "../models/user.model.js";
import { generateJwt } from "../helpers/token.helper.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail
} from "../services/email.service.js";
import crypto from "crypto";

// Login y envío de código de verificación por correo
export const login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email }).populate("roles");

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Usuario no encontrado"
      });
    }

    const matchPassword = await User.comparePassword(req.body.password, user.password);

    if (!matchPassword) {
      return res.status(401).json({
        status: "error",
        message: "Contraseña inválida"
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 3600000; // El código expira en 1 hora
    await user.save();

    await sendVerificationEmail(user.email, verificationCode);

    console.log(`Codigo para el correo ${user.email} es: ${verificationCode}`);

    return res.status(200).json({
      status: "success",
      message: "Código de verificación enviado al correo electrónico"
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Error del servidor al enviar el código de verificación"
    });
  }
};

// Verificación del código de verificación enviado por correo
export const verifyCodeHandler = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).populate("roles", "name");

    if (!user || user.verificationCode !== code.trim() || user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({
        status: "error",
        message: "Código de verificación inválido o expirado"
      });
    }

    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    const access_token = generateJwt(user._id);
    const roleNames = user.roles.map(role => role.name);

    return res.status(200).json({
      status: "success",
      user: {
        access_token,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        _id: user._id,
        roles: roleNames
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Error del servidor al verificar el código"
    });
  }
};

// Manejo de solicitud de restablecimiento de contraseña
export const forgotPasswordHandler = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Usuario no encontrado"
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // El token expira en 1 hora
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken);
    console.log(`Token para el correo ${user.email} es: ${resetToken}`);

    return res.status(200).json({
      status: "success",
      message: "Correo de restablecimiento de contraseña enviado"
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Error del servidor al enviar el correo de restablecimiento de contraseña"
    });
  }
};

// Manejo del restablecimiento de contraseña
export const resetPasswordHandler = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      status: "error",
      message: "Token y nueva contraseña son obligatorios"
    });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Token inválido o expirado"
      });
    }

    // Actualizar la contraseña
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Contraseña restablecida exitosamente"
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Error del servidor al restablecer la contraseña"
    });
  }
};
