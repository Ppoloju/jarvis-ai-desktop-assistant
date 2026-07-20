import ChatBox from "./components/Chat/ChatBox";


import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/settings" element={<Settings />} />   
          <ChatBox />

      </Routes>
    </BrowserRouter>
  );
}

export default App;