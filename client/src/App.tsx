import { Route, Routes } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/ui/side-bar";
import ProtectedRoute from "./components/protected-route";
import Dashboard from "./components/pages/dashboard";
import Agents from "./components/pages/agents";
import Processes from "./components/pages/processes";

function App() {

	return (
		<main className="flex font-lexend bg-primary text-xl">
			<Sidebar />
			<div className="text-secondary ps-10 py-8">
			<Routes>
				<Route path="/" element={<ProtectedRoute allowedRoles={[]}><Dashboard /></ProtectedRoute>} />
				<Route path="/agents" element={<ProtectedRoute allowedRoles={[]}><Agents/></ProtectedRoute>} />
				<Route path="/processes" element={<ProtectedRoute allowedRoles={[]}><Processes/></ProtectedRoute>} />
			</Routes>
			</div>
		</main>
	);
}

export default App;
