import React, { useState, useEffect, JSX } from 'react';
import {
	FaTachometerAlt, FaCogs, FaUsers, FaTools, FaTasks, FaAngleLeft, FaAngleRight,
    FaBellSlash
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const navItems = [
	{ name: 'Dashboard', route: '/', icon: <FaTachometerAlt />, key: 'dashboard' },
	{ name: 'Agents', route: '/agents', icon: <FaTools />, key: 'agents' },
	{ name: 'Jobs', route: '/jobs', icon: <FaTasks />, key: 'jobs' },
	{ name: 'Workers', route: '/workers', icon: <FaUsers />, key: 'workers' },
	{ name: 'Processes', route: '/processes', icon: <FaUsers />, key: 'processes' },
	{ name: 'Sensors', route: '/sensors', icon: <FaUsers />, key: 'sensors' },
	{ name: 'Alerts', route: '/alert-topic', icon: <FaBellSlash/>, key: 'alerts' },
];

const bottomItems = [
	{ name: 'Settings', icon: <FaCogs />, key: 'settings' },
];

const Sidebar: React.FC = () => {
	const [selected, setSelected] = useState<string | null>(null);
	const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

	const handleItemClick = (itemKey: string) => setSelected(itemKey);

	const toggleSidebar = () => setIsCollapsed(!isCollapsed);

	const handleResize = () => setIsCollapsed(window.innerWidth < 870);

	useEffect(() => {
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const getHoverClass = () =>
		isCollapsed && selected ? '' : 'hover:text-purple-100 hover:opacity-80 ';

	const getSelectedClass = (key: string) =>
		window.innerWidth >= 870 && selected === key ? 'text-purple-300' : '';

	const renderItem = (
		item: { name: string; route?: string; icon: JSX.Element; key: string },
		isLink = true
	) => {
		const content = (
			<div
				className={`flex mb-2 items-center rounded-[10px] cursor-pointer pr-5 pl-5 py-4 transition duration-200 ${getSelectedClass(item.key)} ${getHoverClass()}`}
				onClick={() => handleItemClick(item.key)}
			>
				<span className="mr-2">{item.icon}</span>
				<span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{item.name}</span>
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
			className={`h-screen bg-[#1b1b1d] text-md text-[#808191] flex flex-col justify-between items-center transition-all duration-100 ${isCollapsed ? 'w-16' : 'w-1/6'
				}`}
		>
			<button className="md:hidden p-2" onClick={toggleSidebar}>
				{isCollapsed ? <FaAngleRight /> : <FaAngleLeft />}
			</button>

			<ul className="space-y-2 mt-8 px-4 w-full">
				{navItems.map(item => renderItem(item))}
			</ul>

			<ul className="space-y-2 w-full mb-8 px-4">
				{bottomItems.map(item => renderItem(item, false))}
			</ul>
		</div>
	);
};

export default Sidebar;

