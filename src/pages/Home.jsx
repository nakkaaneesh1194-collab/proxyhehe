
import Nav from "../layouts/Nav";
import Search from '../components/SearchContainer'
import Footer from "../components/Footer";
import QuickLinks from "../components/QuickLinks";

export default function Home() {
  return (
    <>
      <Nav />
      <Search />
      <QuickLinks />
      <Footer />
    </>
  );
}
