import { ProductEditView } from "@/components/admin/ProductEditView";

/*
 * Product editor.
 *
 * The product id travels as a query string rather than a path segment. A
 * static export has to emit a file per route, and `/admin/products/[id]` would
 * need every id known at build time — which is impossible for rows an admin
 * creates later. `?id=…` is one file that serves them all.
 */
export default function EditProductPage() {
  return <ProductEditView />;
}
