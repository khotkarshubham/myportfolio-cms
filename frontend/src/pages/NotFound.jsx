import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="public-page">
      <div className="public-page-inner">
        <span className="section-index">404</span>
        <h1 className="public-title">That page is not here.</h1>
        <p className="public-lede">The link may be outdated or the address may be misspelled.</p>
        <Link className="button button-primary" to="/">Return home</Link>
      </div>
    </section>
  );
}
