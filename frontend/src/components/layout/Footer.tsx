export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e8e8e8" }}>
      <div
        className="flex items-center gap-6 px-6"
        style={{ height: 64, maxWidth: 1600, margin: "0 auto" }}
      >
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <p style={{ fontSize: 14, color: "#7d7d7d" }}>
            © 2026 PwC. Samil PricewaterhouseCoopers. All rights reserved.
          </p>
          <img
            src="/pwc-logo.svg"
            alt="PwC"
            style={{ height: 22, width: "auto", flexShrink: 0 }}
          />
        </div>
      </div>
    </footer>
  );
}
