import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      session: session.Session & {
        isAdmin?: boolean;
      };
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ai-girlfriend-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction, // HTTPS in production, HTTP in development
      httpOnly: false, // Allow JavaScript access for cross-origin requests
      sameSite: isProduction ? 'none' : 'lax', // 'none' for production cross-origin, 'lax' for development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: isProduction ? '.replit.app' : undefined, // Set domain for production
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, termsAccepted } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (!termsAccepted) {
        return res.status(400).json({ message: "Terms and conditions must be accepted" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Generate auth token for external access
        const authToken = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
        res.setHeader('X-Auth-Token', authToken);
        res.status(201).json({ 
          ...user, 
          authToken: authToken 
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.logIn(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Login session error" });
        }
        
        // Update last login time
        await storage.updateUserLastLogin(user.id);
        
        // Generate a simple auth token for external access
        const authToken = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
        
        // Set token in response header and body for dual access
        res.setHeader('X-Auth-Token', authToken);
        res.status(200).json({ 
          ...user, 
          authToken: authToken 
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Debug endpoint for mobile authentication issues
  app.get("/api/debug/session", (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user ? { id: req.user.id, username: req.user.username } : null,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer,
        userAgent: req.headers['user-agent']?.substring(0, 100),
        cookie: req.headers.cookie ? 'present' : 'missing'
      },
      session: {
        exists: !!req.session,
        keys: req.session ? Object.keys(req.session) : []
      }
    });
  });
}
