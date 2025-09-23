import express from 'express';
import type { Express, Request, RequestHandler, Response } from 'express';
import movieRouter from './routes/movies.js';
import cors from 'cors';

const port = Number(process.env.PORT) || 1688;
const app: Express = express();

const logger: RequestHandler = (req, res, next) => {
  console.log(`Request received: ${req.method} ${req.url}`);  //lägg till body vid post/put
  next();
};
app.use('/', logger);
app.use(express.json());
app.use('/api/movies', movieRouter);
app.use(cors());
app.use(express.static('./dist/'));







app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});





