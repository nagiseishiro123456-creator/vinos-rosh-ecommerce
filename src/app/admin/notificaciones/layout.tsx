import Link from "next/link";
import "./notifications.css";
export default function NotificationsLayout({children}:{children:React.ReactNode}){return <><nav className="shell" aria-label="Volver a pagos"><Link className="textLink" href="/admin/pagos">← Pagos</Link></nav>{children}</>;}
