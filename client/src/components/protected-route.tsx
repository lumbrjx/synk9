import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
	children: JSX.Element;
	allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
	// fix later
	const role = '';
	const token = 'hhh';
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 100);
		return () => clearTimeout(timer);
	}, []);

	if (isLoading) {
		return null;
	}

	if (!token) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
		return <Navigate to="/unauthorized" replace />;
	}

	return children;
};

export default ProtectedRoute;

