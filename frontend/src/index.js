import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext"; // Import the AuthProvider

// Import Bootstrap CSS so the app can use its classes (e.g., 'btn', 'form-control')
import 'bootstrap/dist/css/bootstrap.min.css';

// Import your custom global CSS file
import './index.css';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <AuthProvider> {/* Wrap the App with the AuthProvider */}
      <App />
    </AuthProvider>
  </BrowserRouter>
);
