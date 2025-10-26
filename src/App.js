// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Editor from "./editor/Editor";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </Router>
  );
}

export default App;
