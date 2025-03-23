import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MyAgents from "./pages/MyAgents";
import ChatAgent from "./pages/ChatAgent"; // Import new page

const App = () => (
    <Router>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/my-agents" element={<MyAgents />} />
            <Route path="/agents/:assistantId" element={<ChatAgent />} /> 
        </Routes>
    </Router>
);

export default App;
