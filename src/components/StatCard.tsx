type StatCardProps = {
    label: string;
    value: string | number;
    description: string;
  };
  
  export default function StatCard({
    label,
    value,
    description,
  }: StatCardProps) {
    return (
      <div className="stat-card">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    );
  }
  