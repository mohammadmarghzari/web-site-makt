import Link from "next/link";
import { listAllProducts } from "@/lib/repo/admin";
import { ProductAdminList } from "@/components/admin/ProductAdminList";
import { Bracket } from "@/components/ui/Bracket";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Bracket>محصولات</Bracket>
          <h1 className="type-display mt-2 text-3xl">کاتالوگ</h1>
        </div>
        <Link
          href="/admin/products/new"
          className="border border-accent bg-accent px-4 py-2 text-[13px] text-[#41525f] transition-colors hover:bg-transparent hover:text-accent"
          style={{ borderRadius: "var(--radius)" }}
        >
          افزودن محصول
        </Link>
      </div>

      <ProductAdminList products={products} />
    </div>
  );
}
