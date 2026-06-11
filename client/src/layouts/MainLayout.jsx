import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function MainLayout() {
  return (
    <>
      <Navbar />
      <Sidebar />

      <div>
        <h2>Jarvis AI Desktop Assistant</h2>
      </div>
    </>
  );
}

export default MainLayout;