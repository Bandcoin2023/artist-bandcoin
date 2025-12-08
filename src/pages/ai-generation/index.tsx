import { MainArea } from "~/components/ai-generation/main/main-area";
import { GenerationSidebar } from "~/components/ai-generation/sidebar/generation-sidebar";

const AIGenerationPage = () => {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <GenerationSidebar />
        <MainArea />
      </div>
    </div>
  );
};
export default AIGenerationPage;
