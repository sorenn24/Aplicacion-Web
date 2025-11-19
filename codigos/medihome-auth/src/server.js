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

const app = express();
app.set("trust proxy", 1);

// ===================== Seguridad / middlewares =====================
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS
// En desarrollo: usa CLIENT_ORIGIN= http://127.0.0.1:5500
// En Render: puedes dejar CLIENT_ORIGIN vacío y esto permite todos (seguro para tu entrega)
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);

// Rate limit básico en rutas de auth
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use("/api/auth", limiter);

// ===================== SERVIR FRONTEND (carpeta integradora) =====================

// Ruta absoluta a /codigos/integradora
const publicPath = path.join(__dirname, "..", "..", "integradora");

// Servir todos los archivos estáticos (HTML, CSS, JS, imágenes…)
app.use("/integradora", express.static(publicPath));

// Que la raíz muestre el login directamente
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "login", "index.html"));
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


