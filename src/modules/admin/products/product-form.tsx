type ProductFormValues = {
  name?: string;
  slug?: string;
  sku?: string | null;
  shortDescription?: string | null;
  description?: string;
  price?: string;
  stock?: number;
  categoryName?: string | null;
  imageUrl?: string | null;
  featured?: boolean;
  active?: boolean;
};

type ProductFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  values?: ProductFormValues;
};

export function ProductForm({ action, submitLabel, values = {} }: ProductFormProps) {
  return (
    <form action={action} className="adminForm">
      <div className="adminFormGrid">
        <label className="adminField adminFieldWide">
          <span>Nombre del producto *</span>
          <input name="name" required minLength={2} maxLength={120} defaultValue={values.name ?? ""} placeholder="Ej. ROSH Uva Borgoña" />
        </label>

        <label className="adminField">
          <span>Slug</span>
          <input name="slug" maxLength={140} defaultValue={values.slug ?? ""} placeholder="Se genera desde el nombre" />
        </label>

        <label className="adminField">
          <span>SKU</span>
          <input name="sku" maxLength={60} defaultValue={values.sku ?? ""} placeholder="Ej. ROSH-001" />
        </label>

        <label className="adminField">
          <span>Precio (S/) *</span>
          <input name="price" type="number" step="0.01" min="0.01" required defaultValue={values.price ?? ""} placeholder="0.00" />
        </label>

        <label className="adminField">
          <span>Stock *</span>
          <input name="stock" type="number" min="0" step="1" required defaultValue={values.stock ?? 0} />
        </label>

        <label className="adminField adminFieldWide">
          <span>Categoría</span>
          <input name="categoryName" maxLength={100} defaultValue={values.categoryName ?? ""} placeholder="Ej. Bebidas de uva" />
          <small>Si la categoría no existe, el sistema la crea automáticamente.</small>
        </label>

        <label className="adminField adminFieldWide">
          <span>Descripción corta</span>
          <input name="shortDescription" maxLength={220} defaultValue={values.shortDescription ?? ""} placeholder="Texto breve para las tarjetas del catálogo" />
        </label>

        <label className="adminField adminFieldWide">
          <span>Descripción completa *</span>
          <textarea name="description" required minLength={10} maxLength={6000} rows={7} defaultValue={values.description ?? ""} placeholder="Describe el producto, origen, características y presentación." />
        </label>

        <label className="adminField adminFieldWide">
          <span>Imagen principal</span>
          <input name="imageUrl" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={2048} defaultValue={values.imageUrl ?? ""} placeholder="/products/morado-intenso.webp o https://res.cloudinary.com/..." />
          <small>
            Puedes usar una imagen de la tienda o un enlace HTTPS de Cloudinary o del repositorio.
          </small>
        </label>
      </div>

      <div className="adminCheckboxRow">
        <label className="adminCheckbox">
          <input name="active" type="checkbox" defaultChecked={values.active ?? true} />
          <span>Visible en la tienda</span>
        </label>
        <label className="adminCheckbox">
          <input name="featured" type="checkbox" defaultChecked={values.featured ?? false} />
          <span>Mostrar como destacado</span>
        </label>
      </div>

      <div className="adminFormActions">
        <button className="button buttonPrimary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
