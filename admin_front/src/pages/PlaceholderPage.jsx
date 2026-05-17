export default function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="card" style={{ textAlign:'center', padding:60 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🚧</div>
        <h2 style={{ fontSize:20, marginBottom:8 }}>قريباً</h2>
        <p style={{ color:'var(--text-muted)' }}>هذه الوحدة قيد التطوير.</p>
      </div>
    </div>
  );
}
