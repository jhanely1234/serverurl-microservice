import twilio from "twilio";

// Ejemplo: twilio.service.js
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Mueve el ID a una variable de entorno
const authToken = process.env.TWILIO_AUTH_TOKEN; // Mueve el token de autenticación a una variable de entorno
const client = twilio(accountSid, authToken);

async function sendWhatsAppMessage(body, to) {
  try {
    const message = await client.messages.create({
      body,
      from: "whatsapp:+14155238886", // Reemplaza con tu número de WhatsApp Twilio
      to: `whatsapp:+591${to}` // Agrega el código del país según sea necesario
    });

    return message;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
}

export default sendWhatsAppMessage;
