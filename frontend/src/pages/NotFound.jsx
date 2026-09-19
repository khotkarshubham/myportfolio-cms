import { Link } from "react-router-dom";
import PublicPage from "../components/PublicPage";

export default function NotFound() {
  return (
    <PublicPage>
      <span className="section-index">404</span>
      <h1 className="public-title">That page is not here.</h1>
      <p className="public-lede">The link may be outdated or the address may be misspelled.</p>
      <Link className="button button-primary" to="/">Return home</Link>
    </PublicPage>
  );
}
