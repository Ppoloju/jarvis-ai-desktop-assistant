import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Settings from "./pages/Settings";
import Automation from "./pages/Automation";
import ChatBox from "./components/Chat/ChatBox";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout><ChatBox /></MainLayout>} />
        <Route path="/automation" element={<MainLayout><Automation /></MainLayout>} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;