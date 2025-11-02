import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import router from './routes/index.js'

const app = express()
dotenv.config();


app.use(cors({origin: "*"}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use('/v1', router);


const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
