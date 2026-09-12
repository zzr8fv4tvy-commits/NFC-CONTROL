# Tapflow NFC

Plataforma con cuentas: cada negocio se registra, entra con su email y contraseña,
y gestiona sus propias tarjetas NFC (nombre, URL de destino) y ve sus escaneos —
por tarjeta y en total.

## Cómo funciona

- Cada tarjeta tiene un enlace propio: `https://tu-dominio.com/t/ID-TARJETA`
- Ese es el enlace que grabas en el chip NFC (con una app tipo "NFC Tools"),
  **no** el enlace de destino directamente.
- Cuando alguien acerca el móvil, el servidor registra el escaneo y redirige
  automáticamente a la URL de destino configurada (reseña, Instagram, lo que sea).
- Cada negocio solo ve y gestiona sus propias tarjetas.

## Instalación local

```bash
npm install
cp .env.example .env      # y cambia SESSION_SECRET por algo aleatorio
npm start
```

Abre `http://localhost:3000`, crea tu cuenta de negocio y ya puedes añadir tarjetas.

Durante el desarrollo, `npm run dev` reinicia el servidor solo al guardar cambios.

## Subirlo a GitHub

```bash
git init
git add .
git commit -m "Primera versión de Tapflow NFC"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/tapflow-nfc.git
git push -u origin main
```

(Crea antes el repositorio vacío en GitHub, sin README, para que el push no choque.)

## Dónde guarda los datos — importante antes de desplegar

Los datos (negocios, tarjetas, escaneos) se guardan en un fichero `data/db.json`
en el propio servidor. Es sencillo y funciona perfecto en un servidor "normal"
con disco persistente, pero **no sirve en plataformas serverless como Netlify o
Vercel**, porque ahí el sistema de archivos se borra en cada ejecución y
perderías los datos.

Opciones para desplegarlo de verdad:

1. **Más sencillo — servidor con disco persistente:** Render, Railway o
   Fly.io. Despliegas este mismo código tal cual, sin cambiar nada.
2. **Si quieres quedarte en Netlify/Vercel:** hay que cambiar `db.js` para
   que en vez de leer/escribir `data/db.json` use una base de datos real
   (por ejemplo Postgres en Supabase o Neon, o Turso). Es un cambio acotado —
   solo tocaría ese fichero — y te lo puedo montar si decides ese camino.

## Estructura del proyecto

```
server.js        rutas: registro, login, dashboard, tarjetas, endpoint /t/:id
db.js            lectura/escritura de data/db.json
views.js         plantillas HTML (login, registro, dashboard, pantalla de escaneo)
public/css       estilos
public/js        interacciones del dashboard (copiar enlace, editar URL)
data/db.json     se crea solo la primera vez que arranca el servidor
```

## Seguridad — a tener en cuenta

- Las contraseñas se guardan con hash (bcrypt), no en texto plano.
- Cambia `SESSION_SECRET` en `.env` antes de poner esto en producción.
- No hay verificación de email ni recuperación de contraseña todavía — para
  un piloto con pocos negocios está bien, pero antes de venderlo como
  producto conviene añadirlo.
