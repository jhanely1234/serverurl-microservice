import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: [3, "El nombre debe contener al menos 3 caracteres"],
    },
    lastname: {
      type: String,
      required: true,
      minlength: [3, "El apellido debe contener al menos 3 caracteres"],
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true,
      },
    ],
    ci: {
      type: Number,
      unique: true,
      sparse: true,
    },
    genero: {
      type: String,
      enum: ["Masculino", "Femenino"],
    },
    fechaNacimiento: {
      type: Date,
    },
    edad: {
      type: Number,
    },
    telefono: {
      type: Number,
    },
    telefono_tutor: {
      type: Number,
    },
    nombre_tutor: {
      type: String,
    },
    calificacion: {
      type: Number,
      min: 0,
      max: 5, // Por ejemplo, una escala de 0 a 5
    },
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    especialidades: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Especialidades",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Métodos para encriptar y comparar contraseñas
userSchema.statics.encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

userSchema.statics.comparePassword = async (password, receivedPassword) => {
  return await bcrypt.compare(password, receivedPassword);
};

// Pre-save hook para encriptar la contraseña antes de guardar
userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  next();
});

export const User = mongoose.model("User", userSchema);
