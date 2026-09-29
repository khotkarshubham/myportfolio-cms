export default function PublicPage({
  children,
  innerClassName = "",
  className = "",
}) {
  return (
    <section className={`public-page ${className}`.trim()}>
      <div className={`public-page-inner content-width ${innerClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}
