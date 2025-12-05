import { MainArea } from "~/components/ai-generation/main/main-area";
import { GenerationSidebar } from "~/components/ai-generation/sidebar/generation-sidebar";

const AIGenerationPage = () => {
    return (
        <div className="h-screen flex flex-col bg-background">

            <div className="flex-1 flex overflow-hidden">
                <GenerationSidebar />
                <MainArea />
            </div>
        </div>
    )
}
export default AIGenerationPage;