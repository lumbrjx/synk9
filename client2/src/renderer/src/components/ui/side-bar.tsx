import React, { useState, useEffect, JSX } from 'react';
import {
  FaTachometerAlt, FaCogs, FaUsers, FaTools, FaAngleLeft, FaAngleRight,
  FaBellSlash
} from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

const navItems = [
  { name: 'Dashboard', route: '/', icon: <FaTachometerAlt />, key: 'dashboard' },
  { name: 'Agents', route: '/agents', icon: <FaTools />, key: 'agents' },
  { name: 'Processes', route: '/processes', icon: <FaUsers />, key: 'processes' },
  { name: 'Sensors', route: '/sensors', icon: <FaUsers />, key: 'sensors' },
  { name: 'Alerts', route: '/alert-topic', icon: <FaBellSlash />, key: 'alerts' },
];

const bottomItems = [
  { name: 'Settings', route: '/settings', icon: <FaCogs />, key: 'settings' },
];

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onCollapse }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const location = useLocation();

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapse?.(newState);
  };

  const handleResize = () => {
    const shouldCollapse = window.innerWidth < 870;
    setIsCollapsed(shouldCollapse);
    onCollapse?.(shouldCollapse);
  };

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isActive = (route: string) => location.pathname === route;

  const renderItem = (
    item: { name: string; route?: string; icon: JSX.Element; key: string },
    isLink = true
  ) => {
    const isItemActive = item.route ? isActive(item.route) : false;

    const content = (
      <div
        className={`
					flex items-center rounded-lg cursor-pointer px-4 py-3
					transition-all duration-200 ease-in-out
					${isItemActive
            ? 'bg-gray-700/50 text-gray-200'
            : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
          }
					${isCollapsed ? 'justify-center' : 'justify-start'}
				`}
      >
        <span className={`${isCollapsed ? 'text-xl' : 'text-lg mr-3'}`}>
          {item.icon}
        </span>
        <span
          className={`
						transition-all duration-200 ease-in-out whitespace-nowrap
						${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}
					`}
        >
          {item.name}
        </span>
      </div>
    );

    return isLink && item.route ? (
      <Link to={item.route} key={item.key} className="w-full">
        {content}
      </Link>
    ) : (
      <li key={item.key} className="w-full">
        {content}
      </li>
    );
  };

  return (
    <div
      className={`
				fixed left-0 top-0 h-screen
				bg-gray-800 border-r border-gray-700
				flex flex-col justify-between
				transition-all duration-300 ease-in-out
				${isCollapsed ? 'w-16' : 'w-64'}
				z-50
			`}
    >
      <div className="flex flex-col flex-grow">
        {/* Toggle Button */}
        <div className='flex justify-between'>
          <div className={`flex items-center ${isCollapsed ? 'ps-0 opacity-0 w-0' : 'opacity-100 w-auto ps-4'}`}>
            <img src={logo} alt="Logo"
              className={`w-8 h-8 mr-2 mt-5 ${isCollapsed ? 'opacity-0' : 'opacity-100'} `} />
            <span
              className={`
						transition-all duration-200 ease-in-out whitespace-nowrap
            pt-4 text-2xl font-bold tracking-wide
            bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-transparent
						${isCollapsed ? 'ps-0 opacity-0 w-0' : 'opacity-100 w-auto'}
					`}
            >
              {!isCollapsed ? 'Synk-9' : ""}
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className="
						p-3 m-2 rounded-lg
						text-gray-400 hover:text-gray-200
						hover:bg-gray-700/50
						transition-colors duration-200
						self-end
					"
          >
            {isCollapsed ? <FaAngleRight /> : < FaAngleLeft />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-grow px-2 py-4">
          <ul className="space-y-1">
            {navItems.map(item => renderItem(item))}
          </ul>
        </nav>

        {/* Bottom Items */}
        <div className="px-2 py-4 border-t border-gray-700">
          <ul className="space-y-1">
            {bottomItems.map(item => renderItem(item))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

