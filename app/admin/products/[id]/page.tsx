import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/repo/admin";
import { ProductForm } from "@/components/admin/ProductForm";
import { Bracket } from "@/components/ui/Bracket";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="type-utility transition-colors hover:!text-accent">
        ← بازگشت به فهرست
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Bracket>ویرایش</Bracket>
          <h1 className="type-display mt-2 text-3xl">{product.name_fa}</h1>
        </div>
        <Link
          href={`/product/${product.slug}`}
          target="_blank"
          className="type-utility transition-colors hover:!text-accent"
        >
          دیدن در سایت ↗
        </Link>
      </div>
      <div className="mt-8">
        <ProductForm product={product} />
      </div>
    </div>
  );
}
