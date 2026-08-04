import { getAllScenes } from "@/lib/repo/scenes";
import { SceneEditor } from "@/components/admin/SceneEditor";
import { Bracket } from "@/components/ui/Bracket";


export default async function AdminScenesPage() {
  const scenes = await getAllScenes();

  return (
    <div>
      <Bracket>پرده‌ها</Bracket>
      <h1 className="type-display mt-2 text-3xl">تیتر و تصویر پرده‌ها</h1>
      <p className="mt-4 max-w-lg text-[13px] leading-relaxed text-ink-muted">
        پردهٔ ۱ و ۳ پس‌زمینهٔ متحرک سایت هستند. فریم‌ها را به ترتیب نامشان آپلود
        کنید — مثلاً <span dir="ltr" className="text-ink">frame-0001.webp</span> تا{" "}
        <span dir="ltr" className="text-ink">frame-0096.webp</span>. تا وقتی فریمی
        آپلود نکنید، تصویر تولیدی پیش‌فرض نمایش داده می‌شود.
      </p>

      <div className="mt-10 space-y-14">
        <SceneEditor scene={scenes.act1} title="پردهٔ ۱ — فیگور شاخص" />
        <div className="border-t border-line pt-14">
          <SceneEditor scene={scenes.act3} title="پردهٔ ۳ — مانیفست" />
        </div>
      </div>
    </div>
  );
}
