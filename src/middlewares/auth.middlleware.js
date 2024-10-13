import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const checkAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id)
        .select(
          "_id name lastname email edad ci telefono_tutor nombre_tutor sexo fechaNacimiento telefono roles especialidades"
        )
        .populate("especialidades", "name")
        .populate("roles", "name");


      return next();
    } catch (error) {
      return res.status(401).json({
        response: "error",
        message: "No autorizado, el token no es válido"
      });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ response: "error", message: "No autorizado, no hay token" });
  }

  return next();
};
