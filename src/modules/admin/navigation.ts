export const ADMIN_NAVIGATION = [
  { title: "Operación", items: [
    { label: "Resumen", href: "/admin", icon: "dashboard" },
    { label: "Producto", href: "/admin/producto", icon: "product" },
    { label: "Pedidos", href: "/admin/pedidos", icon: "orders" },
    { label: "Clientes", href: "/admin/clientes", icon: "customers" },
    { label: "Pagos", href: "/admin/pagos", icon: "payments" },
    { label: "Conciliación", href: "/admin/conciliacion", icon: "settlements", parent: "/admin/pagos" },
    { label: "Confirmaciones", href: "/admin/notificaciones", icon: "notifications", parent: "/admin/pagos" },
    { label: "Envíos", href: "/admin/envios", icon: "shipping" },
  ] },
  { title: "Contenido", items: [
    { label: "Nuestra historia", href: "/admin/historia", icon: "history" },
    { label: "Reseñas", href: "/admin/resenas", icon: "reviews" },
    { label: "Contactos", href: "/admin/contactos", icon: "contacts" },
  ] },
  { title: "Administración", items: [
    { label: "Configuración", href: "/admin/configuracion", icon: "settings" },
    { label: "Lanzamiento", href: "/admin/lanzamiento", icon: "launch" },
    { label: "Respaldo", href: "/admin/respaldo", icon: "backup" },
  ] },
] as const;

export function currentAdminItem(pathname: string) {
  return ADMIN_NAVIGATION.flatMap(group => [...group.items]).find(item => item.href === "/admin" ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
}
