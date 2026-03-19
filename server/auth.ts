import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: "Account not found. Please register first." });
      }
      if (!user.password) {
        return done(null, false, { message: "This account has no password set. Please register a new account." });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Wrong password. Please try again." });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

export function setupAuth() {
  // passport is configured via the calls above
  // this function exists so index.ts can import and call it
}
