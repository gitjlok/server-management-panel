import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import FileManager from "./pages/FileManager";
import Websites from "./pages/Websites";
import Databases from "./pages/Databases";
import Processes from "./pages/Processes";
import Security from "./pages/Security";
import Logs from "./pages/Logs";
import Users from "./pages/Users";
import { Activity, Files, Globe, Database, Cpu, Shield, FileText, Users as UsersIcon } from "lucide-react";

const navigation = [
  { name: "仪表板", href: "/", icon: Activity },
  { name: "文件管理", href: "/files", icon: Files },
  { name: "网站管理", href: "/websites", icon: Globe },
  { name: "数据库", href: "/databases", icon: Database },
  { name: "进程管理", href: "/processes", icon: Cpu },
  { name: "安全设置", href: "/security", icon: Shield },
  { name: "操作日志", href: "/logs", icon: FileText },
  { name: "用户管理", href: "/users", icon: UsersIcon },
];

function Router() {
  return (
    <DashboardLayout navigation={navigation}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/files" component={FileManager} />
        <Route path="/websites" component={Websites} />
        <Route path="/databases" component={Databases} />
        <Route path="/processes" component={Processes} />
        <Route path="/security" component={Security} />
        <Route path="/logs" component={Logs} />
        <Route path="/users" component={Users} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
