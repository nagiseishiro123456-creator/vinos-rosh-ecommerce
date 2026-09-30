export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <header className="header shell">
          <div className="brand">VINOS <strong>ROSH</strong></div>
          <nav>
            <a href="#inicio">Inicio</a>
            <a href="#productos">Productos</a>
            <a href="#historia">Nuestra Historia</a>
            <a href="#contacto">Contacto</a>
          </nav>
          <button className="loginButton">Iniciar sesión</button>
        </header>

        <div className="heroContent shell" id="inicio">
          <p className="eyebrow">VINOS ROSH</p>
          <h1>De nuestro viñedo a tu mesa</h1>
          <p className="lead">
            Base inicial del e-commerce de producción. La siguiente etapa conectará catálogo,
            autenticación, carrito, pagos y administración.
          </p>
          <div className="actions">
            <a className="primaryButton" href="#productos">Ver productos</a>
            <a className="secondaryButton" href="#historia">Nuestra historia</a>
          </div>
        </div>
      </section>

      <section className="benefits shell" id="productos">
        <article><strong>Producción propia</strong><span>Uvas seleccionadas</span></article>
        <article><strong>Sin alcohol</strong><span>Propuesta natural</span></article>
        <article><strong>Envíos por distrito</strong><span>Tarifa administrable</span></article>
        <article><strong>Pago seguro</strong><span>Culqi + Yape</span></article>
      </section>

      <section className="section shell" id="historia">
        <p className="eyebrow wine">SPRINT 0</p>
        <h2>Fundación técnica lista para crecer</h2>
        <p>
          Esta versión todavía no representa el producto final. Es la base de producción sobre la que
          construiremos módulos reales de usuarios, productos, inventario, carrito, checkout, pedidos,
          pagos, reseñas y administración.
        </p>
      </section>

      <footer className="footer" id="contacto">
        <div className="shell">© 2026 Vinos ROSH · E-commerce en desarrollo</div>
      </footer>
    </main>
  );
}
