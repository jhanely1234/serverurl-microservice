import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendVerificationEmail = async (email, code) => {
  try {
    await transporter.sendMail({
      from: `"Clinica MediConsulta" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "¡Codigo de Inicio de Sesion!",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
          <h1 style="color: #4CAF50;">¡Bienvenido a MediConsulta!</h1>
          <p style="font-size: 16px;">Tu código de verificación es: <strong>${code}</strong></p>
        </div>
      `
    });
  } catch (error) {
    console.log(error);
  }
};

export const sendPasswordResetEmail = async (email, token) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await transporter.sendMail({
      from: `"Clinica MediConsulta" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Restablecimiento de Contraseña",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
          <h1 style="color: #4CAF50;">Restablecer Contraseña</h1>
          <p style="font-size: 16px;">Para restablecer tu contraseña, haz clic en el siguiente botón:</p>
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; font-size: 16px;">Restablecer Contraseña</a>
        </div>
      `
    });
  } catch (error) {
    console.log(error);
  }
};
