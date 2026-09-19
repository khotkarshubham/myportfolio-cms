export default function PublicPage({
  children,
  innerClassName = "",
  className = "",
}) {
  return (
    <section className={`public-page ${className}`.trim()}>
      <div className="home-hero-shade" />
      <div className="home-hero-grid" />
      <div className={`public-page-inner ${innerClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}
