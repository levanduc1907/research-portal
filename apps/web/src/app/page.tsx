import { Header } from "../components/research/header";
import { Hero } from "../components/research/hero";
import { UniversityOverview } from "../components/research/university-overview";
import { StatsOverview } from "../components/research/stats-overview";
import { ResearcherDirectory } from "../components/research/researcher-directory";
import { Footer } from "../components/research/footer";
import { AiAssistant } from "../components/research/ai-assistant";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="portal">
      <Header />
      <main id="main-content">
        <Hero />
        <UniversityOverview />
        <StatsOverview />
        <ResearcherDirectory />
      </main>
      <Footer />
      <AiAssistant />
    </div>
  );
}
