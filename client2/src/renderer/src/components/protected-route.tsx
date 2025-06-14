import React, { useEffect, useState, ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
	children: ReactElement;
	allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
	const [isLoading, setIsLoading] = useState(true);
	const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 100);
		return () => clearTimeout(timer);
	}, []);

	if (isLoading) {
		return null;
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && allowedRoles.length > 0) {
		// Role check logic can be added here later
		return children;
	}

	return children;
};

export default ProtectedRoute;

