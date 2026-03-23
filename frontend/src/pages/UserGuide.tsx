import React, { useEffect } from "react";

const UserGuide: React.FC = () => {
    useEffect(() => {
        window.location.href = "/Userguide.html";
    }, []);

    return (
        <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'Inter' }}>
            <p>Redirecting to User Guide...</p>
        </div>
    );
};

export default UserGuide;
