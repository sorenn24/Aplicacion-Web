// src/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const { auth } = require("./middleware/auth");
const routinesRoutes = require("./routes/routines.routes");

const app = express();

// Para que Render/Proxy no rompa el rate-limit ni las IPs
app.set("trust proxy", 1);

// ===================== Seguridad / middlewares =====================
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// ===================== CORS =====================
// Aquí ponemos TODOS los orígenes que pueden llamar a tu API
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://aplicacion-web-03k1.onrender.com", // tu frontend
  "https://medihom-web.onrender.com",         // mismo dominio (por si se sirve todo junto)
];

// Si quieres, también puedes seguir usando CLIENT_ORIGIN extra:
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

app.use(
  cors({
    origin(origin, callback) {
      // peticiones sin Origin (Postman, curl, el servidor mismo, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ Origin NO permitido por CORS:", origin);
      // puedes devolver callback(null, false) para que responda sin CORS,
      // o un error. Para debug se ve en logs.
      return callback(null, false);
    },
    credentials: true,
  })
);

// ===================== Rate limit SOLO en /api/auth =====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use("/api/auth", limiter);

// ===================== SERVIR FRONTEND (carpeta integradora) =====================

// Ruta absoluta a /codigos/integradora (hermana de /medihome-auth)
const publicPath = path.join(__dirname, "..", "..", "integradora");

// Servir todos los archivos estáticos (HTML, CSS, JS, imágenes…)
app.use("/integradora", express.static(publicPath));

// Que la raíz muestre el login directamente
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "login", "index.html"));
});

// (Opcional) home landing
app.get("/home", (_req, res) => {
  res.sendFile(path.join(publicPath, "home", "index.html"));
});

// ===================== RUTAS API =====================

// Salud
app.get("/health", (_req, res) => res.json({ ok: true }));

// 1) Rutas de registro y login (libres)
app.use("/api/auth", authRoutes);

// 2) Ruta protegida /me
app.get("/api/auth/me", auth(), (req, res) => {
  res.json({ user: req.user });
});

// 3) Rutas de rutinas y progreso (MongoDB) — PROTEGIDAS con JWT
app.use("/api/routines", auth(), routinesRoutes);

// ===================== INICIAR SERVIDOR =====================
const port = process.env.PORT || 4000;

// Log seguro para verificar que sí lee tu URI
const safeUri = (process.env.MONGODB_URI || "").replace(
  /:\/\/(.*?):(.*?)@/,
  "://$1:<hidden>@"
);
console.log("🔎 Conectando a:", safeUri);
console.log("🌐 CLIENT_ORIGIN:", process.env.CLIENT_ORIGIN);

connectDB(process.env.MONGODB_URI)
  .then(() =>
    app.listen(port, () =>
      console.log(`🚀 API levantada en http://localhost:${port}`)
    )
  )
  .catch((err) => {
    console.error("Error de conexión:", err);
    process.exit(1);
  });

