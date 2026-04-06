interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children, className = "", action }: ChartCardProps) {
  return (
    <div
      className={`bg-white rounded-lg border ${className}`}
      style={{ boxShadow: "var(--shadow-card)", borderColor: "#DFE3E6" }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#EEEFF1" }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "#000000" }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: "#A1A8B3" }}>{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
