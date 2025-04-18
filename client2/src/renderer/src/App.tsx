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
import { Toaster } from "sonner";
import { io } from 'socket.io-client';
import { baseUrl } from "./config";

export const socket = io(baseUrl);
function App() {


  return (
    <div className="flex font-lexend bg-primary text-xl w-screen">
      <Sidebar />
      <div className="text-secondary w-screen">

        <Toaster />
        <Routes>
          <Route path="/" element={<ProtectedRoute allowedRoles={[]}><Dashboard /></ProtectedRoute>} />
          <Route path="/agents" element={<ProtectedRoute allowedRoles={[]}><Agents /></ProtectedRoute>} />
          <Route path="/processes" element={<ProtectedRoute allowedRoles={[]}><Processes /></ProtectedRoute>} />
          <Route path="/details/:id" element={<ProtectedRoute allowedRoles={[]}><Details /></ProtectedRoute>} />
          <Route path="/agent/details/:id" element={<ProtectedRoute allowedRoles={[]}><AgentDetails /></ProtectedRoute>} />
          <Route path="/sensor/details/:id" element={<ProtectedRoute allowedRoles={[]}><SensorDetails /></ProtectedRoute>} />
          <Route path="/sensors" element={<ProtectedRoute allowedRoles={[]}><Sensors /></ProtectedRoute>} />
        </Routes>

      </div>
    </div>
  );
}

export default App;
