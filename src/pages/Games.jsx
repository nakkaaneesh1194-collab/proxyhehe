import AppLayout from "../layouts/Apps";
import Nav from "../layouts/Nav";

const Apps = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Nav />
      <div className="flex-1 overflow-y-auto">
        <AppLayout type="games" />
      </div>
    </div>
  );
};

export default Apps;
