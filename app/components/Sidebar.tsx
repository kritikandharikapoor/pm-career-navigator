import Link from "next/link";

const NAV_ITEMS = [
  { label: "Dashboard",         href: "/dashboard" },
  { label: "Diagnostic Report", href: "/report" },
  { label: "Roadmap",           href: "/roadmap" },
  { label: "Go Deeper",         href: "/go-deeper" },
  { label: "Re-evaluate",       href: "/re-evaluate" },
];

export default function Sidebar({
  userEmail,
  activePath,
}: {
  userEmail: string;
  activePath: string;
}) {
  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-40"
      style={{
        width: "240px",
        backgroundColor: "rgba(10, 13, 20, 0.98)",
        borderRight: "1px solid rgba(56,189,248,0.08)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}
      >
        <span
          className="text-sm font-semibold tracking-tight"
          style={{ color: "#E8EFF8" }}
        >
          PM Career Navigator
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2.5 rounded-lg text-sm transition-colors duration-150"
              style={{
                backgroundColor: isActive
                  ? "rgba(56,189,248,0.1)"
                  : "transparent",
                color: isActive
                  ? "#38BDF8"
                  : "rgba(232,239,248,0.5)",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User email */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid rgba(56,189,248,0.08)" }}
      >
        <p
          className="text-xs truncate"
          style={{ color: "rgba(232,239,248,0.3)" }}
        >
          {userEmail}
        </p>
      </div>
    </aside>
  );
}
