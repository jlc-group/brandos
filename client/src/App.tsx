import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import BrandBrain from "./pages/BrandBrain";
import SkuMap from "./pages/SkuMap";
import ContentCalendar from "./pages/ContentCalendar";
import AntiAnnoy from "./pages/AntiAnnoy";
import PerformanceAnalysis from "./pages/PerformanceAnalysis";
import AiGenerator from "./pages/AiGenerator";
import ContentHistory from "./pages/ContentHistory";
import ProductSets from "./pages/ProductSets";
import PerformanceImport from "./pages/PerformanceImport";
import AdsRecommendation from "./pages/AdsRecommendation";
import SocialSync from "./pages/SocialSync";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/brand-brain" component={BrandBrain} />
      <Route path="/sku-map" component={SkuMap} />
      <Route path="/calendar" component={ContentCalendar} />
      <Route path="/anti-annoy" component={AntiAnnoy} />
      <Route path="/performance" component={PerformanceAnalysis} />
      <Route path="/ai-generator" component={AiGenerator} />
      <Route path="/contents" component={ContentHistory} />
      <Route path="/history" component={ContentHistory} />
      <Route path="/product-sets" component={ProductSets} />
      <Route path="/social-sync" component={SocialSync} />
      <Route path="/import" component={PerformanceImport} />
      <Route path="/ads-recommendation" component={AdsRecommendation} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
