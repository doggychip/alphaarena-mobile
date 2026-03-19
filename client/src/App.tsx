import { Switch, Route, Router, useLocation, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Home from "@/pages/Home";
import Arena from "@/pages/Arena";
import AgentPage from "@/pages/AgentPage";
import Signals from "@/pages/Signals";
import HFAgentDetail from "@/pages/HFAgentDetail";
import Stake from "@/pages/Stake";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import HowToPlay from "@/pages/HowToPlay";
import AgentPicker from "@/pages/AgentPicker";
import Forum from "@/pages/Forum";
import GlassBox from "@/pages/GlassBox";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">⚔️</div>
        <div className="text-neon-green font-display text-lg tracking-wider">ALPHA ARENA</div>
      </div>
    </div>
  );
}

function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { path: "/", label: "Home", emoji: "🏠" },
    { path: "/arena", label: "Arena", emoji: "⚔️" },
    { path: "/forum", label: "Forum", emoji: "💬" },
    { path: "/stake", label: "Stake", emoji: "🔥" },
    { path: "/profile", label: "Profile", emoji: "👤" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#2A2A3E]"
      style={{
        background: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-[430px] mx-auto flex items-center justify-around h-16 pb-safe">
        {tabs.map((tab) => {
          const isActive =
            tab.path === "/"
              ? location === "/" || location === ""
              : location.startsWith(tab.path);
          return (
            <Link key={tab.path} href={tab.path}>
              <button
                data-testid={`nav-${tab.label.toLowerCase()}`}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] rounded-xl transition-all ${
                  isActive
                    ? "text-neon-green"
                    : "text-[#888899] hover:text-[#E8E8E8]"
                }`}
              >
                <span className={`text-xl ${isActive ? "animate-pulse-glow" : ""}`}>
                  {tab.emoji}
                </span>
                <span
                  className={`text-[10px] font-display font-semibold tracking-wide ${
                    isActive ? "text-neon-green" : ""
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-neon-green mt-0.5" />
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AppRouter() {
  const { user, isLoading } = useAuth();
  const isGuest = localStorage.getItem("alphaarena_guest") === "true";

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="max-w-[430px] mx-auto pb-20 relative">
        <Switch>
          <Route path="/auth" component={Auth} />
          {!user && !isGuest ? (
            <>
              {/* Catch everything — both "/" and deeper paths */}
              <Route path="/" component={Auth} />
              <Route path="/:rest*" component={Auth} />
            </>
          ) : (
            <>
              <Route path="/" component={Home} />
              <Route path="/arena" component={Arena} />
              <Route path="/agent" component={AgentPage} />
              <Route path="/signals" component={Signals} />
              <Route path="/signals/:agentId" component={HFAgentDetail} />
              <Route path="/forum" component={Forum} />
              <Route path="/glassbox" component={GlassBox} />
              <Route path="/stake" component={Stake} />
              <Route path="/profile" component={Profile} />
              <Route path="/how-to-play" component={HowToPlay} />
              <Route path="/pick-agent" component={AgentPicker} />
              <Route component={NotFound} />
            </>
          )}
        </Switch>
      </div>
      {(user || isGuest) && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
