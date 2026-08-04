import { getSettings } from "@/lib/repo/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Bracket } from "@/components/ui/Bracket";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <Bracket>تنظیمات</Bracket>
      <h1 className="type-display mt-2 text-3xl">تنظیمات فروشگاه</h1>
      <div className="mt-8 max-w-lg">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
