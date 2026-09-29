import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import API from "./services/api";

const Home = lazy(() => import("./pages/Home"));
const PublicProjects = lazy(() => import("./pages/PublicProjects"));
const PublicBlog = lazy(() => import("./pages/PublicBlogs"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Contact = lazy(() => import("./pages/Contact"));
const Resume = lazy(() => import("./pages/Resume"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLogin = lazy(() => import("./pages/Admin/Login"));
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard"));
const AdminProjects = lazy(() => import("./pages/Admin/AdminProjects"));
const AdminBlogs = lazy(() => import("./pages/Admin/Blogs"));
const AdminSkills = lazy(() => import("./pages/Admin/Skills"));
const Messages = lazy(() => import("./pages/Admin/Messages"));
const ChangePassword = lazy(() => import("./pages/Admin/ChangePassword"));
const Profile = lazy(() => import("./pages/Admin/Profile"));
const AdminCertifications = lazy(
  () => import("./pages/Admin/AdminCertifications")
);
const AdminExperience = lazy(
  () => import("./pages/Admin/AdminExperience")
);
const AdminAnalytics = lazy(() => import("./pages/Admin/AdminAnalytics"));
const AdminUsers = lazy(() => import("./pages/Admin/AdminUsers"));
const ActivityLogs = lazy(() => import("./pages/Admin/ActivityLogs"));

import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const PageLoader = () => (
  <section className="public-page">
    <div className="public-page-inner content-width">
      <div className="data-empty">Loading…</div>
    </div>
  </section>
);

const AdminPage = ({ children }) => (
  <ProtectedRoute>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    // Never record CMS/admin routes as public portfolio traffic.
    if (isAdmin) return;

    const page = location.pathname || "/";

    API.post("/analytics/visit", { page }).catch(() => {
      // Analytics must never interfere with public navigation.
    });
  }, [location.pathname, isAdmin]);

  return (
    <div
      className={`app-shell ${
        isAdmin ? "admin-shell" : "public-shell"
      }`}
    >
      {!isAdmin && <Navbar />}

      <main className="app-main">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<PublicProjects />} />
            <Route path="/blog" element={<PublicBlog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="*" element={<NotFound />} />

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminPage>
                  <AdminDashboard />
                </AdminPage>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <AdminPage>
                  <Profile />
                </AdminPage>
              }
            />
            <Route
              path="/admin/projects"
              element={
                <AdminPage>
                  <AdminProjects />
                </AdminPage>
              }
            />
            <Route
              path="/admin/blogs"
              element={
                <AdminPage>
                  <AdminBlogs />
                </AdminPage>
              }
            />
            <Route
              path="/admin/skills"
              element={
                <AdminPage>
                  <AdminSkills />
                </AdminPage>
              }
            />
            <Route
              path="/admin/certifications"
              element={
                <AdminPage>
                  <AdminCertifications />
                </AdminPage>
              }
            />
            <Route
              path="/admin/experience"
              element={
                <AdminPage>
                  <AdminExperience />
                </AdminPage>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <AdminPage>
                  <Messages />
                </AdminPage>
              }
            />
            <Route
              path="/admin/change-password"
              element={
                <AdminPage>
                  <ChangePassword />
                </AdminPage>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminPage>
                  <AdminAnalytics />
                </AdminPage>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminPage>
                  <AdminUsers />
                </AdminPage>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminPage>
                  <ActivityLogs />
                </AdminPage>
              }
            />
          </Routes>
        </Suspense>
      </main>

      {!isAdmin && <Footer />}
    </div>
  );
}
