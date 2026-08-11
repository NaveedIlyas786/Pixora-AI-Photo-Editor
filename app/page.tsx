import Footer from "@/components/footer";
import Editor from "@/modules/editor";
import Features from "@/modules/features";
import Hero from "@/modules/hero";
import Pricing from "@/modules/pricing";

export default function Home() {
  return (
    <div>
      <Hero/>
      <Features/>
      <Pricing/>
      <Editor/>
      <Footer/>
    </div>
  );
}
