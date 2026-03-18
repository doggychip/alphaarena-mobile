import { Switch, Route, Router, useLocation, Link } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Arena from "@/pages/Arena";
import AgentPage from "@/pages/AgentPage";
import Signals from "@/pages/Signals";
import HFAgentDetail from "@/pages/HFAgentDetail";
import Stake from "@/pages/Stake";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { path: "/", label: "Home", emoji: "🏠" },
    { path: "/arena", label: "Arena", emoji: "⚔️" },
    { path: "/signals", label: "Signals", emoji: "📡" },
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
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="max-w-[430px] mx-auto pb-20 relative">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/arena" component={Arena} />
          <Route path="/agent" component={AgentPage} />
          <Route path="/signals" component={Signals} />
          <Route path="/signals/:agentId" component={HFAgentDetail} />
          <Route path="/stake" component={Stake} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
