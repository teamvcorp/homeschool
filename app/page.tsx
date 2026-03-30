import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Mission from "./components/Mission";
import Pillars from "./components/Pillars";
import Programs from "./components/Programs";
import Pricing from "./components/Pricing";
import Transparency from "./components/Transparency";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Mission />
        <Pillars />
        <Programs />
        <Pricing />
        <Transparency />
      </main>
      <Footer />
    </>
  );
}
