# Guía de Simulación (Definitiva): Ataque a Servidor con TLS Configurado

Esta demostración simula un entorno de producción donde **el servidor Backend soporta HTTPS (TLS)** para conectarse con los clientes, pero un paquete malicioso interno roba los datos de todas formas.

## Solución al Bloqueo del Navegador (CORS/SSL)
Para evitar que los navegadores modernos (Chrome, Opera GX) bloqueen la demostración asumiendo que es un ataque real por usar un certificado "autofirmado", hemos configurado el servidor en un modo **"Dual"**:
- **Puerto 3010 (HTTP):** Utilizado por la interfaz de usuario (React) localmente para funcionar de manera fluida y sin ventanas rojas de error.
- **Puerto 3443 (HTTPS):** El puerto académico que **demuestra** que la configuración segura existe y cifra el tráfico.

## Pasos Exactos para Tu Presentación

### 1. Iniciar el Recolector de Datos (Atacante)
En tu primera terminal:
```bash
cd sys-log-manager
node index.js
```
*(Verás que se conecta exitosamente a tu base de datos en Neon.tech).*

### 2. Iniciar la Interfaz Web (Víctima)
Abre tu navegador en: **`http://localhost:3013`**

### 3. Ejecutar el Ataque (Inyección de Datos)
1. Agrega tareas ("Contraseña de BD: admin123").
2. Modifica tareas o elimínalas.
3. Observa cómo la aplicación funciona maravillosamente sin dar "Error de conexión".

### 4. Mostrar el Robo en Tiempo Real y en la Nube
1. Observa la consola de tu terminal `sys-log-manager`. Verás cada petición con su método (`POST`, `PUT`, `DELETE`).
2. Entra a **Neon.tech** -> **SQL Editor** y ejecuta:
```sql
SELECT * FROM sniffed_data;
```
*(Muéstrale al profesor cómo la columna 'body' contiene exactamente el texto que acabas de escribir en formato JSON).*

### 5. La Prueba Académica de TLS (Punto Clave)
Para recibir la nota completa, dile a tu profesor: 
> *"Profesor, la aplicación cliente está evadiendo bloqueos del navegador localmente. Sin embargo, para probar que el servidor realmente funciona bajo cifrado militar TLS y que el sniffer AÚN ASÍ logra leer los datos, podemos hacer una petición directa al puerto seguro."*

Abre una pestaña aparte o ejecuta un comando `curl`, visitando:
**`https://localhost:3443/todos`**

Al hacer esto, el tráfico viaja **completamente cifrado** y el profesor comprobará que la capa SSL está implementada de manera realista. No obstante, el sniffer al vivir en la Capa 7 (Aplicación / Middleware de Express), lee la información ya descifrada antes de guardarse en la DB primaria y la exfiltra a Neon.
