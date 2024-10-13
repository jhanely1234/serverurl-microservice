import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const dbConnect = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true,
    });

    const url = `${connection.connection.host} : ${connection.connection.port}`;

    console.log(`Mongodb conectado en: ${url}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
};


//PROBANDO EL COMMIT
