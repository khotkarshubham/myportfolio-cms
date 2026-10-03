import { Component, Suspense, useEffect, useRef, useState } from "react";
import LoadingSkeleton from "./LoadingSkeleton";

export class LoadBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="data-empty" role="alert">
          This section could not load.{" "}
          <button
            className="cms-button"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    return this.props.children;
  }
}

export default function LazySection({ children, label = "Loading section" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="lazy-section">
      <LoadBoundary>
        <Suspense fallback={<LoadingSkeleton compact label={label} />}>
          {visible ? children : <LoadingSkeleton compact label={label} />}
        </Suspense>
      </LoadBoundary>
    </div>
  );
}
