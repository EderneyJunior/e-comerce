import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorMiddleware } from '#shared/middlewares/error.middleware.js';
import router from '#router/router.js';
import { env } from '#config/env.js';

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: env.APP_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);
app.use(morgan('combined'));
app.use(express.json());

app.use(router);

app.use(errorMiddleware);

export default app;
