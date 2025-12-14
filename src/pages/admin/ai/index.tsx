import { PackageManagement } from "~/components/common/ai-package-management"
import { SystemStats } from "~/components/common/ai-system.stats"
import AdminLayout from "~/components/layout/root/AdminLayout"

const AdminAIPage = () => {
    return (
        <AdminLayout>
            <div className="min-h-screen bg-background">
                <div className="border-b">
                    <div className="container mx-auto px-4 py-4">
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Credit Package Management</p>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-8 space-y-8">
                    <SystemStats />
                    <PackageManagement />
                </div>
            </div>
        </AdminLayout>
    )
}
export default AdminAIPage