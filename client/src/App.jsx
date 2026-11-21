import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ChatBox from "./components/Chat/ChatBox";
import Automation from "./pages/Automation";
import History from "./pages/History";
import Settings from "./pages/Settings";

const withLayout = (page) => <MainLayout>{page}</MainLayout>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={withLayout(<ChatBox />)} />
        <Route path="/automation" element={withLayout(<Automation />)} />
        <Route path="/history" element={withLayout(<History />)} />
        <Route path="/settings" element={withLayout(<Settings />)} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
