import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useGuestMode } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AGENT_EMOJIS = ["🤖", "🦊", "🐉", "⚡", "🎯", "🔥", "💎", "🌙", "🦅", "🐋"];

export default function Auth() {
  const { login, register } = useAuth();
  const [, navigate] = useLocation();
  const { setGuest } = useGuestMode();

  const [activeTab, setActiveTab] = useState("login");
  const [loginUsername, setLoginUsername] = useState(() => localStorage.getItem("alphaarena_username") || "");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("alphaarena_username"));
  const [showAccountNotFound, setShowAccountNotFound] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
      if (rememberMe) {
        localStorage.setItem("alphaarena_username", loginUsername);
      } else {
        localStorage.removeItem("alphaarena_username");
      }
      // Navigate home — React state is already updated via query cache
      navigate("/");
    } catch (err: any) {
      const msg = err?.message || "Invalid username or password.";
      // If account not found, auto-register and log in seamlessly
      if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("register")) {
        try {
          await login(loginUsername, loginPassword, true);
          if (rememberMe) {
            localStorage.setItem("alphaarena_username", loginUsername);
          }
          navigate("/");
          return;
        } catch (retryErr: any) {
          setLoginError(retryErr?.message || "Auto-registration failed. Please register manually.");
          setShowAccountNotFound(true);
        }
      } else {
        setLoginError(msg);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    try {
      await register(regUsername, regEmail, regPassword);
      // Auto-remember after registration
      localStorage.setItem("alphaarena_username", regUsername);
      navigate("/");
    } catch (err: any) {
      setRegError(err?.message || "Registration failed. Try a different username.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleGuest = () => {
    setGuest(true);
    navigate("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(160deg, #0A0A0F 0%, #14141F 60%, #0A0A0F 100%)" }}
    >
      {/* Decorative agent emojis */}
      <div className="flex gap-2 mb-4 flex-wrap justify-center max-w-[280px]">
        {AGENT_EMOJIS.map((emoji, i) => (
          <span
            key={i}
            className="text-lg opacity-40"
            style={{
              filter: "drop-shadow(0 0 6px rgba(0,255,136,0.3))",
              animation: `pulse ${1.5 + (i % 3) * 0.4}s ease-in-out infinite alternate`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      {/* Logo / Title */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3" style={{ filter: "drop-shadow(0 0 16px rgba(0,255,136,0.6))" }}>⚔️</div>
        <h1
          className="font-display font-black text-3xl tracking-widest"
          style={{
            background: "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ALPHA ARENA
        </h1>
        <p className="text-[#888899] text-sm mt-1 tracking-wider font-display">Trade with AI Agents</p>
      </div>

      {/* Card */}
      <Card
        className="w-full max-w-[390px] border-[#2A2A3E]"
        style={{ background: "rgba(20, 20, 31, 0.95)", backdropFilter: "blur(20px)" }}
      >
        <CardContent className="pt-5 px-5 pb-5">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setLoginError(""); setRegError(""); setShowAccountNotFound(false); }} className="w-full">
            <TabsList className="w-full mb-5 bg-[#0A0A0F] border border-[#2A2A3E] p-0.5 rounded-xl h-10">
              <TabsTrigger
                value="login"
                className="flex-1 rounded-lg text-sm font-display font-semibold tracking-wide data-[state=active]:bg-neon-green data-[state=active]:text-[#0A0A0F] data-[state=inactive]:text-[#888899] transition-all"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 rounded-lg text-sm font-display font-semibold tracking-wide data-[state=active]:bg-neon-green data-[state=active]:text-[#0A0A0F] data-[state=inactive]:text-[#888899] transition-all"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-username" className="text-[#888899] text-xs font-display tracking-wider uppercase">
                    Username <span className="normal-case tracking-normal text-[#555566]">(not case-sensitive)</span>
                  </Label>
                  <Input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    placeholder="your_username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    className="bg-[#0A0A0F] border-[#2A2A3E] text-[#E8E8E8] placeholder-[#555566] focus:border-neon-green focus:ring-neon-green/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-[#888899] text-xs font-display tracking-wider uppercase">
                    Password
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="bg-[#0A0A0F] border-[#2A2A3E] text-[#E8E8E8] placeholder-[#555566] focus:border-neon-green focus:ring-neon-green/20 h-11"
                  />
                </div>

                {/* Remember Me */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2A3E] bg-[#0A0A0F] text-neon-green accent-[#00FF88] cursor-pointer"
                  />
                  <span className="text-xs text-[#888899] font-display">Remember me</span>
                </label>

                {loginError && (
                  <div className="rounded-lg border border-[#FF3B9A]/30 bg-[#FF3B9A]/10 px-3 py-2 text-xs text-[#FF3B9A] font-display">
                    ⚠️ {loginError}
                  </div>
                )}

                {showAccountNotFound && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("register");
                      setRegUsername(loginUsername);
                      setShowAccountNotFound(false);
                      setLoginError("");
                    }}
                    className="w-full text-center text-xs text-neon-cyan hover:text-neon-green transition-colors font-display py-2 rounded-xl border border-neon-cyan/30 hover:border-neon-green/30 bg-neon-cyan/5"
                  >
                    🚀 Create a new account as "{loginUsername}" →
                  </button>
                )}

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-11 font-display font-bold tracking-widest text-sm rounded-xl transition-all"
                  style={{
                    background: loginLoading
                      ? "rgba(0,255,136,0.4)"
                      : "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
                    color: "#0A0A0F",
                    boxShadow: loginLoading ? "none" : "0 0 20px rgba(0,255,136,0.3)",
                  }}
                >
                  {loginLoading ? "LOGGING IN..." : "LOGIN"}
                </Button>
              </form>
            </TabsContent>

            {/* REGISTER TAB */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username" className="text-[#888899] text-xs font-display tracking-wider uppercase">
                    Username
                  </Label>
                  <Input
                    id="reg-username"
                    type="text"
                    autoComplete="username"
                    placeholder="degen_trader_99"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    required
                    className="bg-[#0A0A0F] border-[#2A2A3E] text-[#E8E8E8] placeholder-[#555566] focus:border-neon-green focus:ring-neon-green/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="text-[#888899] text-xs font-display tracking-wider uppercase">
                    Email
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="bg-[#0A0A0F] border-[#2A2A3E] text-[#E8E8E8] placeholder-[#555566] focus:border-neon-green focus:ring-neon-green/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="text-[#888899] text-xs font-display tracking-wider uppercase">
                    Password
                  </Label>
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    className="bg-[#0A0A0F] border-[#2A2A3E] text-[#E8E8E8] placeholder-[#555566] focus:border-neon-green focus:ring-neon-green/20 h-11"
                  />
                </div>

                {regError && (
                  <div className="rounded-lg border border-[#FF3B9A]/30 bg-[#FF3B9A]/10 px-3 py-2 text-xs text-[#FF3B9A] font-display">
                    ⚠️ {regError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={regLoading}
                  className="w-full h-11 font-display font-bold tracking-widest text-sm rounded-xl transition-all"
                  style={{
                    background: regLoading
                      ? "rgba(0,255,136,0.4)"
                      : "linear-gradient(135deg, #00FF88 0%, #00D4FF 100%)",
                    color: "#0A0A0F",
                    boxShadow: regLoading ? "none" : "0 0 20px rgba(0,255,136,0.3)",
                  }}
                >
                  {regLoading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#2A2A3E]" />
            <span className="text-[10px] text-[#555566] font-display tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-[#2A2A3E]" />
          </div>

          {/* Guest mode */}
          <button
            type="button"
            onClick={handleGuest}
            className="w-full text-center text-sm text-[#888899] hover:text-neon-green transition-colors font-display tracking-wide py-2 rounded-xl border border-[#2A2A3E] hover:border-neon-green/30"
          >
            Continue as Guest →
          </button>

          <p className="text-[10px] text-[#444455] text-center mt-3 font-display">
            Guest mode uses demo data. Sign up to save progress.
          </p>
        </CardContent>
      </Card>

      {/* Attribution */}
      <div className="mt-6">
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-[#333344] hover:text-[#555566] transition-colors"
        >
          Created with Perplexity Computer
        </a>
      </div>
    </div>
  );
}
