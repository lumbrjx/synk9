import { Route, Routes } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/ui/side-bar";
import ProtectedRoute from "./components/protected-route";
import Dashboard from "./components/pages/dashboard";
import Agents from "./components/pages/agents";
import Processes from "./components/pages/processes";
import Details from "./components/pages/details";
import Sensors from "./components/pages/sensors";
import SensorDetails from "./components/pages/sensor-details";
import AgentDetails from "./components/pages/agent-details";
import { toast, Toaster } from "sonner";
import { io } from 'socket.io-client';
import { baseUrl } from "./config";
import { useEffect, useState } from "react";
import Alerts from "./components/pages/alerts";
import AlertDetails from "./components/pages/alert-details";

export const socket = io(baseUrl, {
  auth: {
    token: "your-jwt-token-here",
    type: "client"
  }
});

type AlertTypeLiteral = "normal" | "scheduled" | "offline" | "incident" | "breakdown";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleDiscon = () => {
      toast.error("Lost connection to agent..");
    };

    const handleMessage = (message: any) => {
      console.log("the data is here", message)

      const alert = message["alert:alert"].data.alert;
      switch (alert.alertType as AlertTypeLiteral) {
        case "normal":
          toast(alert.message);
          break;
        case "scheduled":
          toast.info(alert.message);
          break;
        case "offline":
          toast.warning(alert.message);
          break;
        case "incident":
          toast.error(`🚨 ${alert.message}`);
          break;
        case "breakdown":
          toast.error(`💥 ${alert.message}`);
          break;
        default:
          console.warn("Unknown alert type:", alert.alertType);
          toast(alert.message);
      }
    };

    socket.on("agent-disconnected", handleDiscon)
    socket.on('alert', handleMessage);

    return () => {
      socket.off("agent-disconnected", handleDiscon)
      socket.off('alert', handleMessage);
    };
  }, [socket]);

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100 font-lexend">
      <Sidebar onCollapse={setIsSidebarCollapsed} />
      
      {/* Main Content Area */}
      <main 
        className={`
          flex-1 transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}
        `}
      >
        <div className="p-6">
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#1F2937',
                color: '#F3F4F6',
                border: '1px solid #374151'
              },
              className: 'bg-gray-800 text-gray-100',
            }}
          />
          
          <Routes>
            <Route path="/" element={<ProtectedRoute allowedRoles={[]}><Dashboard /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute allowedRoles={[]}><Agents /></ProtectedRoute>} />
            <Route path="/processes" element={<ProtectedRoute allowedRoles={[]}><Processes /></ProtectedRoute>} />
            <Route path="/details/:id" element={<ProtectedRoute allowedRoles={[]}><Details /></ProtectedRoute>} />
            <Route path="/agent/details/:id" element={<ProtectedRoute allowedRoles={[]}><AgentDetails /></ProtectedRoute>} />
            <Route path="/sensor/details/:id" element={<ProtectedRoute allowedRoles={[]}><SensorDetails /></ProtectedRoute>} />
            <Route path="/sensors" element={<ProtectedRoute allowedRoles={[]}><Sensors /></ProtectedRoute>} />
            <Route path="/alert-topic" element={<ProtectedRoute allowedRoles={[]}><Alerts /></ProtectedRoute>} />
            <Route path="/alert-topic/details/:id" element={<ProtectedRoute allowedRoles={[]}><AlertDetails /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
