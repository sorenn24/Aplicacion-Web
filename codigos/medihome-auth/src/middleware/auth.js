const jwt = require("jsonwebtoken");

function getTokenFromReq(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

function auth(required = true) {
  return (req, res, next) => {
    const token = getTokenFromReq(req);
    if (!token) {
      if (!required) return next();
      return res.status(401).json({ message: "No autenticado" });
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }
  };
}

module.exports = { auth };
