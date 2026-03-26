import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
        // Redirect to login if no token is found
        return <Navigate to="/" replace />;
    }

    // Token exists, render the child routes
    return <Outlet />;
};

export default ProtectedRoute;
