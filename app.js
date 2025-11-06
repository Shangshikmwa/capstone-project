import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import router from './SRC/routes/index.js'
import connectDB from './SRC/config/cloudinary.js';

const app = express()
dotenv.config();

// DIAGNOSTIC: log before attempting connect
console.log('starting app — before connectDB()', { NODE_ENV: process.env.NODE_ENV, PORT: process.env.PORT });

connectDB()
  .then(() => console.log('connectDB() resolved'))
  .catch(err => console.error('connectDB() rejected', err));

app.use(cors({origin: "*"}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());

app.use((req, res, next) => {
  req._startTime = Date.now();
  console.log(`--> ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    const ms = Date.now() - req._startTime;
    console.log(`<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// quick health endpoint for fast checks
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.use('/v1', router);

const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
