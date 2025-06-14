import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const [isAiDiagnosticsEnabled, setIsAiDiagnosticsEnabled] = useState(true);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load saved preferences
    const savedAiDiagnostics = localStorage.getItem('aiDiagnostics');

    if (savedAiDiagnostics !== null) {
      setIsAiDiagnosticsEnabled(savedAiDiagnostics === 'true');
    }
  }, []);

  const handleAiDiagnosticsToggle = () => {
    const newValue = !isAiDiagnosticsEnabled;
    setIsAiDiagnosticsEnabled(newValue);
    localStorage.setItem('aiDiagnostics', String(newValue));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-200 mb-2">Settings</h1>
        <p className="text-gray-400">Manage your application preferences and configurations</p>
      </div>

      <div className="space-y-6">
        {/* Notifications */}
        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <FaBell className="text-gray-400 mr-3 text-xl" />
            <h2 className="text-xl font-semibold text-gray-200">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-200">Ai Diagnostics</h3>
                <p className="text-sm text-gray-400">Receive Ai alerts for important events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isAiDiagnosticsEnabled}
                  onChange={handleAiDiagnosticsToggle}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Logout Section */}
        <section className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-200">Account</h2>
              <p className="text-sm text-gray-400">Manage your account settings</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
