import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Automation from "./pages/Automation";
import Files from "./pages/Files";
import Computer from "./pages/Computer";
import Reminders from "./pages/Reminders";
import History from "./pages/History";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const withLayout = (page) => <MainLayout>{page}</MainLayout>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={withLayout(<Home />)} />
        <Route path="/automation" element={withLayout(<Automation />)} />
        <Route path="/files" element={withLayout(<Files />)} />
        <Route path="/computer" element={withLayout(<Computer />)} />
        <Route path="/reminders" element={withLayout(<Reminders />)} />
        <Route path="/history" element={withLayout(<History />)} />
        <Route path="/settings" element={withLayout(<Settings />)} />
        <Route path="*" element={withLayout(<NotFound />)} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
