import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { Bracket } from "@/components/ui/Bracket";

export default function NewProductPage() {
  return (
    <div>
      <Link href="/admin/products" className="type-utility transition-colors hover:!text-accent">
        ← بازگشت به فهرست
      </Link>
      <div className="mt-4">
        <Bracket>محصول تازه</Bracket>
        <h1 className="type-display mt-2 text-3xl">افزودن فیگور</h1>
      </div>
      <div className="mt-8">
        <ProductForm product={null} />
      </div>
    </div>
  );
}
